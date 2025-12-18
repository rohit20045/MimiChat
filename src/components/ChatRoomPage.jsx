import { useState, useEffect, useRef } from 'react';
import {
    db,
    collection,
    addDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    deleteDoc,
    doc,
    getMessagesCollectionPath,
    getParticipantsCollectionPath,
    
} from '../firebase';
import { auth, signOut } from '../firebase';

import CryptoHelper from '../utils/crypto';
import Modal from './common/Modal';
import Inbox from './common/Inbox';
import Loading from './common/Loading';

import { 
    LogOut, Key, Users, Copy, Send, ShieldAlert, Mail
} from 'lucide-react';

import { sendInvite } from '../firebase';


function ChatRoomPage({ user, roomId, secretKey, onLeave, isNewRoom , onJoin, derivedKey}) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userCount, setUserCount] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Deriving encryption key...');
    const [showSecretModal, setShowSecretModal] = useState(isNewRoom);

    // Added for Invitation
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSending, setInviteSending] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');

    const messagesEndRef = useRef(null);

    // PRESENCE + MESSAGES LISTENERS
    useEffect(() => {
        if (!roomId || !user?.uid) return;

        setLoading(false);
        setLoadingText("");

        const participantRef = doc(
            db,
            getParticipantsCollectionPath(roomId),
            user.uid
        );

        // JOIN ONCE
        setDoc(participantRef, {
            uid: user.uid,
            email: user.email,
            joined: serverTimestamp()
        }, { merge: true });

        // LISTEN
        const unsubscribeParticipants = onSnapshot(
            collection(db, getParticipantsCollectionPath(roomId)),
            (snapshot) => {
                setUserCount(snapshot.size);
            }
        );

        // Messages
        const messagesCol = collection(db, getMessagesCollectionPath(roomId));
        const q = query(messagesCol);

        const unsubscribeMessages = onSnapshot(
            q,
            async (snapshot) => {
                const newMessages = [];
                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    let text;

                    if (!derivedKey) 
                    {
                        text = "[DECRYPTING…]";
                    } 
                    else 
                    {
                        text = await CryptoHelper.decryptMessage(
                            derivedKey,
                            data.text,
                            data.hash
                        );
                    }
                    newMessages.push({
                        id: docSnap.id,
                        senderUid: data.senderUid,
                        senderEmail: data.senderEmail,
                        timestamp: data.timestamp,
                        hash:data.hash,
                        encryptedText: data.text,  
                        text                          
                    });
                }

                newMessages.sort(
                    (a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
                );

                setMessages(newMessages);
            },
            (err) => {
                setError("Could not fetch messages.");
            }
        );

        return () => {
            unsubscribeParticipants();
            unsubscribeMessages();
            deleteDoc(participantRef).catch(() => {});
        };
    },[roomId, user.uid]);

    useEffect(() => {
        if (!derivedKey || messages.length === 0) return;

        const redecrypt = async () => {
            let didUpdate = false;

            const updated = await Promise.all(
                messages.map(async (msg) => {
                    if (msg.text !== "[DECRYPTING…]") return msg;

                    didUpdate = true;

                    const decrypted = await CryptoHelper.decryptMessage(
                        derivedKey,
                        msg.encryptedText,
                        msg.hash
                    );

                    return {
                        ...msg,
                        text: decrypted
                    };
                })
            );

            if (didUpdate) {
                setMessages(updated);
            }
        };

        redecrypt();
    }, [derivedKey, messages]);


    // SCROLL BOTTOM
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // SEND MESSAGE
const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !derivedKey) return;

        const currentMsg = newMessage;
        setNewMessage("");

        try {
            const encrypted = await CryptoHelper.encryptMessage(
                derivedKey,
                currentMsg
            );

            await addDoc(
                collection(db, getMessagesCollectionPath(roomId)),
                {
                    text: encrypted.payload, //  encrypted message
                    hash: encrypted.hash,     //  integrity hash
                    senderEmail: user.email,
                    senderUid: user.uid,
                    timestamp: serverTimestamp()
                }
            );
        } catch (e) {
            console.error(e);
            setError("Failed to send message.");
            setNewMessage(currentMsg);
        }
    };


    // COPY TO CLIPBOARD
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    // SEND INVITE
    const sendRoomInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviteSending(true);
        setInviteMessage('');

        try {
            await sendInvite(inviteEmail, {
                senderEmail: user.email,
                roomId,
                secretKey
            });

            setInviteMessage('Invitation sent.');
            setInviteEmail('');
            setShowInviteModal(false);
        } catch (err) {
            setInviteMessage('Failed to send invite.');
        } finally {
            setInviteSending(false);
        }
    };

    if (loading) return <Loading text={loadingText} />;

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <p className="text-2xl text-red-400 mb-6">{error}</p>
                <button
                    onClick={onLeave}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Back to Menu
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">

            {/* HEADER */}
            <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center">

                <div>
                    <h2 className="text-xl font-bold">
                        Room: <span className="font-mono text-blue-300">{roomId}</span>
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users size={16} />
                        <span>{userCount} online</span>
                    </div>
                </div>

                <div className="flex gap-2 items-center">

                    <Inbox
                        userEmail={user.email}
                        currentRoomId={roomId}
                        onAcceptInvite={({ roomId, secretKey }) => {
                            onJoin(roomId, secretKey);
                        }}
                        leaveRoom={onLeave}
                    />

                    {/* INVITE USER */}
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <Mail size={16} /> Invite
                    </button>

                    {/* SECRET KEY MODAL */}
                    <button
                        onClick={() => setShowSecretModal(true)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <Key size={18} /> Room Info
                    </button>

                    {/* LEAVE ROOM */}
                    <button
                        onClick={onLeave}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <LogOut size={18} /> Leave
                    </button>
{/* GLOBAL LOGOUT */}
<button
    onClick={async () => {
        try {
            await signOut(auth);  
            window.location.href = "/"; 
        } catch (err) {
            console.error("Logout failed:", err);
        }
    }}
    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2"
>
    <LogOut size={16} /> Logout
</button>



                </div>
            </header>

            {/* CHAT AREA */}
            <main className="flex-1 overflow-y-auto p-4 bg-gray-900">
                {messages.length === 0 ? (
                    <p className="text-center text-gray-400">No messages yet.</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex mb-3 ${
                            msg.senderUid === user.uid ? 'justify-end' : 'justify-start'
                        }`}>
                            <div className={`p-3 rounded-lg max-w-lg shadow relative ${
                                msg.senderUid === user.uid 
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-white'
                            }`}>

                                {msg.isToxic && (
                                    <div className="absolute -top-2 -left-2">
                                        <ShieldAlert size={20} className="text-yellow-300 bg-red-600 rounded-full p-0.5" />
                                    </div>
                                )}

                                <p className="text-sm font-bold mb-1 opacity-70">
                                    {msg.senderEmail}
                                </p>
                                <p className="text-base whitespace-pre-wrap break-words">
                                    {msg.text}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* INPUT AREA */}
            <footer className="bg-gray-800 p-4">
                <form onSubmit={handleSend} className="flex gap-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white 
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type your encrypted message..."
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-lg"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </footer>

            {/* ROOM INFO MODAL */}
            <Modal show={showSecretModal} onClose={() => setShowSecretModal(false)} title="Share This Room">
                <p className="text-gray-300 mb-6">
                    Share BOTH Room ID and Secret Key to allow others to join.
                </p>

                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Room ID</label>
                    <div className="flex">
                        <input
                            type="text"
                            readOnly
                            value={roomId}
                            className="flex-1 p-2 font-mono bg-gray-700 border border-gray-600 rounded-l-lg text-gray-200"
                        />
                        <button
                            onClick={() => copyToClipboard(roomId)}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg flex items-center"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-300 text-sm font-bold mb-2">Secret Key</label>
                    <div className="flex">
                        <input
                            type="text"
                            readOnly
                            value={secretKey}
                            className="flex-1 p-2 font-mono bg-gray-700 border border-gray-600 rounded-l-lg text-gray-200"
                        />
                        <button
                            onClick={() => copyToClipboard(secretKey)}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg flex items-center"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                </div>
            </Modal>

            {/* INVITE MODAL */}
            <Modal show={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite User">
                <form onSubmit={sendRoomInvite}>
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-bold mb-2">Recipient Email</label>
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg 
                                       text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="friend@example.com"
                            required
                        />
                    </div>

                    {inviteMessage && (
                        <p className="text-green-400 text-sm mb-4">{inviteMessage}</p>
                    )}

                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={inviteSending}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            {inviteSending ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}

export default ChatRoomPage;
