import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface NameInputCardProps {
  onSubmit: (firstName: string, lastName: string) => void;
  disabled?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
}

export function NameInputCard({ onSubmit, disabled, initialFirstName = '', initialLastName = '' }: NameInputCardProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);

  useEffect(() => {
    if (initialFirstName) setFirstName(initialFirstName);
    if (initialLastName) setLastName(initialLastName);
  }, [initialFirstName, initialLastName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() && lastName.trim()) {
      onSubmit(firstName.trim(), lastName.trim());
    }
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={disabled}
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={disabled}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!isValid || disabled}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0B0B0C] font-medium rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          Continue
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
