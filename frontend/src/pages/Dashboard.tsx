import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Key, Activity, TrendingUp, LogOut, ChevronRight } from 'lucide-react';

interface Summary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_latency_ms: number;
}

interface AggregatedDataPoint {
  group: string;
  total_tokens: number;
}

interface Stat {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [summaryRes, aggregatedRes] = await Promise.all([
        fetch('http://localhost:3000/stats/usage/summary?days=7'),
        fetch('http://localhost:3000/stats/usage/aggregated?days=7&group_by=model'),
      ]);

      const summaryData = await summaryRes.json();
      const aggregatedData = await aggregatedRes.json();

      setSummary(summaryData);
      setAggregatedData(aggregatedData);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const stats: Stat[] = [
    {
      name: 'Total Requests',
      value: summary?.total_requests || 0,
      icon: Activity,
      color: 'bg-blue-500',
    },
    {
      name: 'Input Tokens',
      value: (summary?.total_input_tokens || 0).toLocaleString(),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Output Tokens',
      value: (summary?.total_output_tokens || 0).toLocaleString(),
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      name: 'Avg Latency',
      value: summary?.avg_latency_ms ? `${summary.avg_latency_ms}ms` : '0ms',
      icon: Activity,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LLM Firewall</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-gray-100 flex items-center text-sm text-gray-600"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="mt-1 text-sm text-gray-600">
              Overview of your LLM usage and metrics
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {stats.map((stat) => (
                  <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                          <stat.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              {stat.name}
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {stat.value}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Usage by Model (Last 7 Days)
                  </h3>
                  {aggregatedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={aggregatedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="group" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total_tokens" fill="#3b82f6" name="Total Tokens" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      No data available
                    </div>
                  )}
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => navigate('/api-keys')}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Key className="h-5 w-5 text-blue-600 mr-3" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">Manage API Keys</p>
                          <p className="text-sm text-gray-500">Create and revoke keys</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => navigate('/usage')}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 text-green-600 mr-3" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">View Detailed Usage</p>
                          <p className="text-sm text-gray-500">See all API requests</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
