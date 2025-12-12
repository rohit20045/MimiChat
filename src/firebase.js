import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';

import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    addDoc, 
    onSnapshot, 
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    Timestamp,
    updateDoc,
    getDocs
} from 'firebase/firestore';

// =======================================================
//   FIREBASE CONFIG
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBf-2lj4zNZd-o_5ZbGFOS-e2vX60twz7o",
  authDomain: "mimichat-1779e.firebaseapp.com",
  projectId: "mimichat-1779e",
  storageBucket: "mimichat-1779e.firebasestorage.app",
  messagingSenderId: "589856993764",
  appId: "1:589856993764:web:a532d8a55db8e6cab817f1"
};
//

const appId = firebaseConfig.appId;

// =======================================================
// Initializing Firebase
// =======================================================
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// Sign in anonymously
signInAnonymously(auth)
  .then(() => {
    console.log("Signed in anonymously");
  })
  .catch((error) => {
    console.error("Anonymous sign-in failed:", error);
  });
  
// =======================================================
// Firestore Path Helpers ( Original)
// =======================================================
const getRoomCollectionPath = () => `/artifacts/${appId}/public/data/chatRooms`;
const getRoomDocPath = (roomId) => `${getRoomCollectionPath()}/${roomId}`;
const getMessagesCollectionPath = (roomId) => `${getRoomDocPath(roomId)}/messages`;
const getParticipantsCollectionPath = (roomId) => `${getRoomDocPath(roomId)}/participants`;

// =======================================================
//  EMAIL → PATH NORMALIZATION
// Firestore does not allow "." in document IDs
// =======================================================
export function normalizeEmailForPath(email) {
    return email.replace(/\./g, ',');
}

// =======================================================
//  SEND INVITATION
// =======================================================
export async function sendInvite(recipientEmail, invitation) {
    const normalized = normalizeEmailForPath(recipientEmail);

    const invitationsCol = collection(
        db,
        `invitations/${normalized}/receivedInvites`
    );

    const docRef = await addDoc(invitationsCol, {
        senderEmail: invitation.senderEmail,
        roomId: invitation.roomId,
        secretKey: invitation.secretKey,
        status: "pending",
        read: false,
        createdAt: serverTimestamp()
    });

    return docRef.id;
}

// =======================================================
//  LISTEN TO INBOX (REAL-TIME)
// =======================================================
export function listenToInbox(recipientEmail, callback, onError = console.error) {
    const normalized = normalizeEmailForPath(recipientEmail);

    const invitationsCol = collection(
        db,
        `invitations/${normalized}/receivedInvites`
    );

    const q = query(invitationsCol, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
        q,
        (snap) => {
            const invites = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            callback(invites);
        },
        onError
    );

    return unsubscribe;
}

// =======================================================
//  UPDATE INVITATION STATUS
// =======================================================
export async function updateInviteStatus(recipientEmail, inviteId, updates = {}) {
    const normalized = normalizeEmailForPath(recipientEmail);

    const inviteDoc = doc(
        db,
        `invitations/${normalized}/receivedInvites`,
        inviteId
    );

    await updateDoc(inviteDoc, updates);
}

// =======================================================
//  DELETE INVITE
// =======================================================
export async function deleteInvite(recipientEmail, inviteId) {
    const normalized = normalizeEmailForPath(recipientEmail);

    const inviteDoc = doc(
        db,
        `invitations/${normalized}/receivedInvites`,
        inviteId
    );

    await deleteDoc(inviteDoc);
}

// =======================================================
//  FETCH INBOX (Once)
// =======================================================
export async function fetchInboxOnce(recipientEmail) {
    const normalized = normalizeEmailForPath(recipientEmail);

    const invitationsCol = collection(
        db,
        `invitations/${normalized}/receivedInvites`
    );

    const q = query(invitationsCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// =======================================================
//  EXPORT EVERYTHING
// =======================================================
export {
    auth,
    db,

    // Auth
    signOut,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,

    // Firestore
    doc,
    setDoc,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    serverTimestamp,
    deleteDoc,
    Timestamp,
    getDocs,

    // Path Helpers
    getRoomCollectionPath,
    getMessagesCollectionPath,
    getParticipantsCollectionPath
};
