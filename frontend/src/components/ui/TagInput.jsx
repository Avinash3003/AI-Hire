import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export const TagInput = ({ label, tags, setTags, error, placeholder = "Add a tag..." }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    if (input.trim() !== '' && !tags.includes(input.trim())) {
      setTags([...tags, input.trim()]);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <div className={`p-2 bg-dark-bg/50 border rounded-xl transition-colors ${
          error ? 'border-red-500' : 'border-dark-border focus-within:border-primary-500'
        }`}>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, index) => (
            <span key={index} className="flex items-center gap-1 bg-primary-500/20 text-primary-300 px-2 py-1 rounded-md text-sm border border-primary-500/20">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-primary-400 hover:text-red-400">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2 py-1 placeholder-gray-500"
            placeholder={placeholder}
          />
          <button type="button" onClick={addTag} className="p-1 rounded-md bg-dark-surface hover:bg-dark-border text-gray-400 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};
