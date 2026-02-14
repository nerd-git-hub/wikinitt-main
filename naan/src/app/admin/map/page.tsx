'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getGraphQLClient } from '@/lib/graphql';
import { request } from 'graphql-request';
import { GET_MAP_LOCATIONS, ADD_MAP_LOCATION, DELETE_MAP_LOCATION } from '@/queries/map';
import { WikiMapLocation } from '@/data/mapData';

export default function AdminMapPage() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8080/query';
    // Use getGraphQLClient wrapper or manually create client if token exists
    // But since getGraphQLClient takes token, we can use it inside mutationFn

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('building');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [desc, setDesc] = useState('');
    const [error, setError] = useState('');

    // Fetch
    const { data: mapData, isLoading } = useQuery({
        queryKey: ['mapLocations'],
        queryFn: async () => request<{ mapLocations: any[] }>(endpoint, GET_MAP_LOCATIONS as any),
    });
    const locations = mapData?.mapLocations || [];

    // Add Mutation
    const addMutation = useMutation({
        mutationFn: async (newLoc: any) => {
            const client = getGraphQLClient(session?.backendToken);
            return client.request(ADD_MAP_LOCATION as any, { input: newLoc });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mapLocations'] });
            // Reset form
            setName('');
            setLat('');
            setLng('');
            setDesc('');
            setError('');
        },
        onError: (err: any) => {
            console.error(err);
            setError(err.response?.errors?.[0]?.message || err.message || 'Failed to add location');
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const client = getGraphQLClient(session?.backendToken);
            return client.request(DELETE_MAP_LOCATION as any, { id });
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['mapLocations'] });
             setError('');
        },
        onError: (err: any) => {
            console.error(err);
            setError(err.response?.errors?.[0]?.message || err.message || 'Failed to delete location');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            setError('Latitude and Longitude must be valid numbers');
            return;
        }
        
        const newLocation = {
            name,
            type,
            coordinates: [latitude, longitude],
            description: desc,
            menu: [] // Default empty menu for now
        };

        addMutation.mutate(newLocation);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Manage Map Locations</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md h-fit">
                    <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200 border-b pb-2">Add New Location</h2>
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm break-words">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                required 
                                placeholder="Enter location name"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" 
                                value={type} 
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="building">Building</option>
                                <option value="eatery">Eatery</option>
                                <option value="Mess">Mess</option>
                                <option value="Departments">Departments</option>
                                <option value="Hostels">Hostels</option>
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                                <input 
                                    type="number" 
                                    step="any" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" 
                                    value={lat} 
                                    onChange={e => setLat(e.target.value)} 
                                    required 
                                    placeholder="10.75..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                                <input 
                                    type="number" 
                                    step="any" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" 
                                    value={lng} 
                                    onChange={e => setLng(e.target.value)} 
                                    required 
                                    placeholder="78.81..."
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white h-24 resize-none" 
                                value={desc} 
                                onChange={e => setDesc(e.target.value)} 
                                placeholder="Brief description..."
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                            disabled={addMutation.isPending}
                        >
                            {addMutation.isPending ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding...
                                </>
                            ) : 'Add Location'}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200 border-b pb-2 flex justify-between items-center">
                        <div>Existing Locations</div>
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded-full">{locations.length} locations</span>
                    </h2>
                    
                    <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                        {locations.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700">
                                No locations found. Add your first one!
                            </div>
                        ) : (
                            locations.map((loc: any) => (
                                <div key={loc.id} className="bg-white dark:bg-zinc-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-shadow duration-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{loc.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                                                    loc.type === 'eatery' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                                    loc.type === 'Mess' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                    loc.type === 'Hostels' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                                    loc.type === 'Departments' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                    {loc.type}
                                                </span>
                                            </div>
                                            <p className="text-xs font-mono text-gray-500 mb-2 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                {loc.coordinates ? loc.coordinates.join(', ') : 'No coords'}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {loc.description || <span className="italic text-gray-400">No description provided</span>}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if(confirm('Are you sure you want to delete this location?')) {
                                                    deleteMutation.mutate(loc.id);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-md transition-colors"
                                            disabled={deleteMutation.isPending && deleteMutation.variables === loc.id}
                                            title="Delete Location"
                                        >
                                            {deleteMutation.isPending && deleteMutation.variables === loc.id ? (
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
