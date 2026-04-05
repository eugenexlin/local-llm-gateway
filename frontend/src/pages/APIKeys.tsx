import { useState, useEffect, FormEvent } from 'react';
import { Key, Copy, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  created_at: string;
  user_id: string | null;
}

function APIKeys() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/api-keys?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.map((key: ApiKey) => ({
          ...key,
          api_key: null
        })));
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: FormEvent) => {
     e.preventDefault();
     if (!newKeyName.trim() || !user?.id) return;

     try {
       const response = await fetch('http://localhost:3000/api/api-keys', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ name: newKeyName, user_id: user.id }),
       });

       if (response.ok) {
         const data = await response.json();
         setApiKeys([{ ...data, api_key: null }, ...apiKeys]);
         setNewKeyName('');
         setShowForm(false);
         setCreatedKey(data.api_key);
         setShowCreatedKeyDialog(true);
       }
     } catch (error) {
       console.error('Failed to create API key:', error);
     }
   };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/api-keys/${keyId}?user_id=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const copyToClipboard = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCreatedKey = () => {
    setShowCreatedKeyDialog(false);
  };

  return (
    <MainLayout>
    <div className="bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
              <p className="mt-1 text-sm text-gray-600">
                Manage your API keys for programmatic access
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </button>
          </div>

          <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleCreateKey}>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  id="keyName"
                  label="Key Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key"
                  required
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowForm(false)} color="primary">
                  Cancel
                </Button>
                <Button type="submit" color="primary" variant="contained">
                  Create API Key
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new API key.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <li key={key.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {key.name}
                        </p>
                        <div className="mt-2 flex items-center space-x-4">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {key.api_key ? `${key.api_key.substring(0, 16)}...${key.api_key.slice(-8)}` : '••••••••••••••••'}
                          </code>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 space-x-2">
                        <button
                          onClick={() => key.api_key && copyToClipboard(key.api_key)}
                          disabled={!key.api_key}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {copied ? (
                            <span className="text-green-600">Copied!</span>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

                   <Dialog open={showCreatedKeyDialog} onClose={handleCloseCreatedKey} maxWidth="sm" fullWidth>
            <DialogTitle>Your API Key</DialogTitle>
            <DialogContent>
              <p className="text-sm text-gray-600 mb-2">
                Copy this key now. You won't be able to see it again.
              </p>
              <code className="block bg-gray-100 p-3 rounded-md text-sm break-all mb-4">
                {createdKey}
              </code>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseCreatedKey} color="primary">
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  copyToClipboard(createdKey!);
                  handleCloseCreatedKey();
                }}
                color="primary"
                variant="contained"
              >
                {copied ? 'Copied!' : 'Copy Key'}
              </Button>
            </DialogActions>
          </Dialog>
        </div>
       </main>
    </div>
    </MainLayout>
  );
}

export default APIKeys;
