import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Users, FolderKanban, FileText, Calendar, UsersRound, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';

const typeIcons = {
  employee: Users,
  project: FolderKanban,
  document: FileText,
  request: Calendar,
  team: UsersRound,
  audit: Shield,
};

const typeColors = {
  employee: 'bg-blue-50 text-blue-700 border-blue-200',
  project: 'bg-amber-50 text-amber-700 border-amber-200',
  document: 'bg-purple-50 text-purple-700 border-purple-200',
  request: 'bg-green-50 text-green-700 border-green-200',
  team: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  audit: 'bg-red-50 text-red-700 border-red-200',
};

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const executeSearch = async (val) => {
    if (!val || val.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/search?query=${encodeURIComponent(val)}`);
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      toast.error('Search request failed');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      executeSearch(query);
    }, 350);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const filteredResults = filter === 'all'
    ? results
    : results.filter(r => r.search_type === filter);

  const filterTabs = [
    { id: 'all', label: 'All Results' },
    { id: 'employee', label: 'Employees' },
    { id: 'project', label: 'Projects' },
    { id: 'document', label: 'Documents' },
    { id: 'request', label: 'Requests' },
    { id: 'team', label: 'Teams' },
    { id: 'audit', label: 'Audits' },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div>
        <h2 className="text-2xl font-semibold text-[#111111]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Enterprise Search</h2>
        <p className="text-sm text-gray-500 mt-0.5">Search across employees, projects, audit checklists, documents, requests, and teams</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing to search (minimum 2 characters)..."
          className="w-full pl-11 pr-4 py-3.5 border border-gray-250 rounded-sm text-base bg-white focus:ring-1 focus:ring-[#0020F5] focus:border-[#0020F5] outline-none"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-5 w-5 border-b-2 border-[#0020F5]" />
        )}
      </div>

      {/* Filter Tabs */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b pb-3 border-[#E5E7EB]">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors ${
                filter === tab.id
                  ? 'bg-[#0020F5] text-white border-[#0020F5]'
                  : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({tab.id === 'all' ? results.length : results.filter(r => r.search_type === tab.id).length})
            </button>
          ))}
        </div>
      )}

      {/* Search results listing */}
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden">
        {query.trim().length < 2 ? (
          <div className="py-20 text-center space-y-2">
            <SearchIcon className="mx-auto text-gray-300" size={32} strokeWidth={1} />
            <p className="text-sm text-gray-400">Enter a search query to search the organization index.</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm text-gray-400">No matches found for "{query}"</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {filteredResults.map((item, idx) => {
              const Icon = typeIcons[item.search_type] || FileText;
              const cl = typeColors[item.search_type] || 'bg-gray-50';
              return (
                <Link
                  key={idx}
                  to={item.link || '/dashboard'}
                  className="p-5 hover:bg-gray-50 flex items-start space-x-4 transition-colors group"
                >
                  <div className={`w-9 h-9 rounded-sm flex items-center justify-center border flex-shrink-0 ${cl}`}>
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-[#111111] group-hover:text-[#0020F5] transition-colors">{item.title}</h4>
                      <span className={`text-[9px] px-1.5 py-0.2 uppercase border font-bold rounded-sm ml-2 ${cl}`}>
                        {item.search_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="text-gray-350 self-center group-hover:text-[#0020F5] transition-colors" size={16} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
