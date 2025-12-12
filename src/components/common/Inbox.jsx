// src/components/common/Inbox.jsx
import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { Mail, CheckCircle, XCircle } from 'lucide-react';
import { listenToInbox, updateInviteStatus, deleteInvite } from '../../firebase'; // adapt path if needed

/**
 * Props:
 * - userEmail (string) : current signed-in user's email (recipient)
 * - onAcceptInvite({ roomId, secretKey }) : callback when user accepts invite
 */
function Inbox({ userEmail, onAcceptInvite }) {
  const [show, setShow] = useState(false);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    setLoading(true);
    const unsubscribe = listenToInbox(userEmail, (fetched) => {
      setInvites(fetched || []);
      setLoading(false);
    }, (err) => {
      console.error('Inbox listener failed', err);
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, [userEmail]);

  const unreadCount = invites.filter(i => !i.read).length;

  const handleAccept = async (invite) => {
    try {
      // mark accepted and read
      await updateInviteStatus(userEmail, invite.id, { status: 'accepted', read: true });
      // callback so parent can join
      if (onAcceptInvite && invite.roomId && invite.secretKey) {
        onAcceptInvite({ roomId: invite.roomId, secretKey: invite.secretKey });
        setShow(false);
      }
    } catch (e) {
      console.error('Accept failed', e);
    }
  };

  const handleDismiss = async (invite) => {
    try {
      await updateInviteStatus(userEmail, invite.id, { read: true, status: 'dismissed' });
    } catch (e) {
      console.error('Dismiss failed', e);
    }
  };

  const handleDelete = async (invite) => {
    try {
      await deleteInvite(userEmail, invite.id);
    } catch (e) {
      console.error('Delete invite failed', e);
    }
  };

  return (
    <>
      <button
    onClick={() => setShow(true)}
    className="relative p-2 rounded-full bg-gray-700 hover:bg-gray-600 border border-gray-500 shadow-lg transition"
    aria-label="Inbox"
    title="Inbox"
>
    <Mail className="text-white" size={20} />
    {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unreadCount}
        </span>
    )}
</button>

      <Modal show={show} onClose={() => setShow(false)} title="Inbox">
        {loading ? (
          <p className="text-gray-300">Loading invites...</p>
        ) : invites.length === 0 ? (
          <p className="text-gray-400">No invites.</p>
        ) : (
          <div className="space-y-4">
            {invites.map(inv => (
              <div key={inv.id} className={`p-3 rounded-lg bg-gray-800 border ${inv.read ? 'opacity-80' : 'border-blue-600'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">{inv.senderEmail}</p>
                    <p className="text-sm text-gray-300 mb-1">Room: <span className="font-mono text-blue-300">{inv.roomId}</span></p>
                    <p className="text-xs text-gray-400 break-all">Key: <span className="font-mono">{inv.secretKey}</span></p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => handleAccept(inv)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                      <CheckCircle size={16} /> Accept
                    </button>
                    <button onClick={() => handleDismiss(inv)} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded">
                      <XCircle size={16} /> Dismiss
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                  <span>{inv.status || 'pending'}</span>
                  <button onClick={() => handleDelete(inv)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

export default Inbox;
