import psycopg2
from typing import Iterator, List, Optional, Sequence, Tuple
from langchain_core.stores import ByteStore

class PostgresByteStore(ByteStore):
    def __init__(
        self,
        connection_string: str,
        table_name: str = "doc_store",
        schema: str = "public",
    ) -> None:
        self.connection_string = connection_string
        self.table_name = table_name
        self.schema = schema
        self._create_table_if_not_exists()

    def _create_table_if_not_exists(self) -> None:
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS {self.schema}.{self.table_name} (
                        key TEXT PRIMARY KEY,
                        value BYTEA
                    );
                    """
                )
            conn.commit()

    def mget(self, keys: Sequence[str]) -> List[Optional[bytes]]:
        if not keys:
            return []
        
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT key, value FROM {self.schema}.{self.table_name} WHERE key = ANY(%s)",
                    (list(keys),)
                )
                results = {}
                for k, v in cur.fetchall():
                    if v is not None:
                        results[k] = bytes(v)
                    else:
                        results[k] = None
        
        return [results.get(key) for key in keys]

    def mset(self, key_value_pairs: Sequence[Tuple[str, bytes]]) -> None:
        if not key_value_pairs:
            return

        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                # Use upsert (INSERT ... ON CONFLICT DO UPDATE)
                args_list = [(k, v) for k, v in key_value_pairs]
                cur.executemany(
                    f"""
                    INSERT INTO {self.schema}.{self.table_name} (key, value)
                    VALUES (%s, %s)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
                    """,
                    args_list
                )
            conn.commit()

    def mdelete(self, keys: Sequence[str]) -> None:
        if not keys:
            return

        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"DELETE FROM {self.schema}.{self.table_name} WHERE key = ANY(%s)",
                    (list(keys),)
                )
            conn.commit()

    def yield_keys(self, prefix: Optional[str] = None) -> Iterator[str]:
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                if prefix:
                    cur.execute(
                        f"SELECT key FROM {self.schema}.{self.table_name} WHERE key LIKE %s",
                        (f"{prefix}%",)
                    )
                else:
                    cur.execute(f"SELECT key FROM {self.schema}.{self.table_name}")
                
                for row in cur.fetchall():
                    yield row[0]
