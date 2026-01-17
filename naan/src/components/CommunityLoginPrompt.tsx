"use client";

import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

export default function CommunityLoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-blue-50 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-500 to-amber-500" />

        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-50 rounded-full">
            <Lock className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Join WikiNITT</h2>

        <p className="text-gray-600 mb-8">
          You need to be logged in to view discussions, participate in groups,
          and connect with other students.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => signIn("dauth")}
          className="w-full flex items-center justify-center py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-200"
        >
          <LogIn className="w-5 h-5 mr-2" />
          Login with Dauth
        </motion.button>

        <p className="mt-4 text-xs text-gray-400">
          Only verifiable NITT students can access this area.
        </p>
      </motion.div>
    </div>
  );
}
