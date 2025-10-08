import React from 'react';
import { UserProfile } from '../../types';

interface AvatarProps {
  user: UserProfile;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-32 h-32 text-3xl',
};

const COLORS = ["#1E88E5","#43A047","#8E24AA","#FB8C00","#3949AB","#00ACC1","#F4511E"];

// Simple hash function to get a consistent color for a user ID
const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const getInitials = (name: string): string => {
  const words = name.split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = SIZES[size];
  const colorIndex = getHash(user.id) % COLORS.length;
  const color = COLORS[colorIndex];
  const initials = getInitials(user.display_name);

  // Cache-busting URL
  const imageUrl = user.avatar_url ? `${user.avatar_url}?v=${user.avatar_version}` : null;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${sizeClasses} ${className}`}
      style={{ backgroundColor: imageUrl ? 'transparent' : color }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={user.display_name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-white">{initials}</span>
      )}
    </div>
  );
};