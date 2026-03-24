"use client";

import React, { useState } from "react";
import {
    User, Lock, Bell, Shield, Save,
    Mail, Phone, Camera, Check
} from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);

    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        smsAlerts: false,
        promotional: false,
    });

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1500); // Mock save
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "security", label: "Security", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500">Manage your account preferences and security.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70"
                >
                    {loading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <Save size={18} />
                    )}
                    Save Changes
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* Sidebar Tabs */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                                        : "text-gray-600 hover:bg-gray-50 bg-transparent"
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === "profile" && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
                        >
                            <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                                <div className="relative group cursor-pointer">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-300 overflow-hidden">
                                        {/* Placeholder for user image */}
                                        <User />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Profile Photo</h3>
                                    <p className="text-sm text-gray-500">Update your profile picture.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" defaultValue="Admin User" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                                    <input type="email" defaultValue="admin@example.com" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Phone</label>
                                    <input type="text" defaultValue="+1 234 567 890" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Role</label>
                                    <input type="text" defaultValue="Administrator" disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "security" && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
                        >
                            <h3 className="text-lg font-bold text-gray-900 pb-2 border-b border-gray-100">Change Password</h3>
                            <div className="space-y-4 max-w-md">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                                    <input type="password" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">New Password</label>
                                    <input type="password" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                                    <input type="password" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "notifications" && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
                        >
                            <div className="space-y-4">
                                {[
                                    { key: "emailAlerts", title: "Email Alerts", desc: "Receive updates via email." },
                                    { key: "smsAlerts", title: "SMS Notifications", desc: "Get critical alerts on your phone." },
                                    { key: "promotional", title: "Marketing", desc: "Receive promotional offers and news." }
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                            <p className="text-xs text-gray-500">{item.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    );
}
