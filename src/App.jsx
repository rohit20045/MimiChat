import { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signOut } from './firebase';

import CryptoHelper from './utils/crypto';
import AuthPage from './components/AuthPage';
import MenuPage from './components/MenuPage';
import ChatRoomPage from './components/ChatRoomPage';
import Loading from './components/common/Loading';

/**
 * Main App Component
 * This component handles the main page routing and authentication state.
 */
function App() {
    const [derivedKey, setDerivedKey] = useState(null);
    const [page, setPage] = useState('loading');
    const [user, setUser] = useState(null);
    const [roomInfo, setRoomInfo] = useState({
        roomId: null,
        secretKey: null,
        isNewRoom: false
    });

    useEffect(() => 
        {
        if (!roomInfo.roomId || !roomInfo.secretKey) {
            setDerivedKey(null);
            return;
        }

        const derive = async () => {
            const key = await CryptoHelper.deriveKey(roomInfo.secretKey);
            setDerivedKey(key);
        };

        derive();
    }, [roomInfo.roomId, roomInfo.secretKey]);

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
        setRoomInfo({
            roomId: null,
            secretKey: null,
            isNewRoom: false
        });

        setDerivedKey(null);

        setPage('menu');
    };

    // Global Logout Handler 
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
                return <Loading text="Loading MiMiChat..." />;

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
                        derivedKey={derivedKey}
                        onLogout={handleLogout} 
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
