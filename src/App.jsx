import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signOut } from './firebase';

import AuthPage from './components/AuthPage';
import MenuPage from './components/MenuPage';
import ChatRoomPage from './components/ChatRoomPage';
import Loading from './components/common/Loading';

/**
 * Main App Component
 * This component handles the main page routing and authentication state.
 */
function App() {
    const [page, setPage] = useState('loading'); // loading, auth, menu, room
    const [user, setUser] = useState(null);
    const [roomInfo, setRoomInfo] = useState({
        roomId: null,
        secretKey: null,
        isNewRoom: false
    });

    // Handle Firebase Auth state
    useEffect(() => {
        if (!auth) {
            setPage('error');
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setPage('menu');
            } else {
                setPage('auth');
            }
        });
        return () => unsubscribe();
    }, []);

    const handleAuthSuccess = (authedUser) => {
        setUser(authedUser);
        setPage('menu');
    };

    const handleCreateRoom = (roomId, secretKey) => {
        setRoomInfo({ roomId, secretKey, isNewRoom: true });
        setPage('room');
    };

    const handleJoinRoom = (roomId, secretKey) => {
        setRoomInfo({ roomId, secretKey, isNewRoom: false });
        setPage('room');
    };

    const handleLeaveRoom = () => {
        setPage('menu');
        setRoomInfo({ roomId: null, secretKey: null, isNewRoom: false });
    };

    // Global Logout Handler (Option C)
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setPage('auth');
            setUser(null);
        } catch (err) {
            console.error("Error signing out:", err);
        }
    };

    // Page router
    const renderPage = () => {
        switch (page) {
            case 'loading':
                return <Loading text="Loading PrivyChat..." />;

            case 'auth':
                return <AuthPage onAuthSuccess={handleAuthSuccess} />;

            case 'menu':
                return (
                    <MenuPage
                        user={user}
                        onCreate={handleCreateRoom}
                        onJoin={handleJoinRoom}
                    />
                );

            case 'room':
                return (
                    <ChatRoomPage
                        user={user}
                        roomId={roomInfo.roomId}
                        secretKey={roomInfo.secretKey}
                        onLeave={handleLeaveRoom}
                        isNewRoom={roomInfo.isNewRoom}
                        onJoin={handleJoinRoom}
                        onLogout={handleLogout} // Added for inbox accept → auto join
                    />
                );

            case 'error':
                return (
                    <div className="min-h-screen flex items-center justify-center">
                        <p className="text-2xl text-red-500">Error: Could not initialize app.</p>
                    </div>
                );

            default:
                return (
                    <div className="min-h-screen flex items-center justify-center">
                        <p className="text-2xl">Unknown state.</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">

          

            {renderPage()}
        </div>
    );
}

export default App;
