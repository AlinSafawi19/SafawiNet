'use client';

import { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiArrowRightOnRectangle, HiUser, HiCog } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';

interface UserDropdownProps {
    user: {
        name: string;
        email: string;
    };
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 hover:text-purple-500 transition-colors text-base font-medium"
                aria-label="User menu"
                aria-haspopup="true"
            >
                <span className="hidden sm:block">{user.name}</span>
                {HiChevronDown({
                    className: `w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`
                })}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {HiUser({ className: "w-4 h-4 mr-3" })}
                            Profile
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {HiCog({ className: "w-4 h-4 mr-3" })}
                            Settings
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                            {HiArrowRightOnRectangle({ className: "w-4 h-4 mr-3" })}
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
