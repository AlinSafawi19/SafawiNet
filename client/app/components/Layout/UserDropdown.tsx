'use client';

import { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiArrowRightOnRectangle, HiUser } from 'react-icons/hi2';
import { useAuth } from '../../contexts/AuthContext';

interface UserDropdownProps {
    user: {
        name: string;
        email: string;
    };
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const openDropdown = () => {
        setIsOpen(true);
        setIsAnimating(false);
    };

    const closeDropdown = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsAnimating(false);
        }, 300);
    };

    const handleLogout = async () => {
        await logout();
        closeDropdown();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => isOpen ? closeDropdown() : openDropdown()}
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
                <div
                    className={`dropdown-menu absolute right-0 bg-white z-50 overflow-hidden min-w-[200px] ${isAnimating
                            ? 'animate-dropdownClose'
                            : 'animate-dropdownOpen'
                        }`}
                >
                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={() => closeDropdown()}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 font-medium font-helvetica"
                        >
                            {HiUser({ className: "w-4 h-4 mr-3" })}
                            My Account
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 font-medium font-helvetica"
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
