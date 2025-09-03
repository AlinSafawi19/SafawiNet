'use client';

import { useAuth } from '../../contexts/AuthContext';
import Footer from './Footer';

const FooterWrapper = () => {
    const { user } = useAuth();

    // Hide footer for admin users
    if (user && user.roles && user.roles.includes('ADMIN')) {
        return null;
    }

    return <div className="mt-10 sm:mt-20"> <Footer /> </div>;
};

export default FooterWrapper;
