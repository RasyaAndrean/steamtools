interface PlatformBadgeProps {
  platform: 'steam' | 'epic' | 'gog';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const platformStyles = {
  steam: {
    bg: 'bg-[#1b2838]',
    border: 'border-[#2a475e]',
    text: 'text-[#66c0f4]',
    label: 'Steam',
    icon: '🎮',
  },
  epic: {
    bg: 'bg-[#2f2f2f]',
    border: 'border-[#494949]',
    text: 'text-[#fcfcfc]',
    label: 'Epic',
    icon: '⚡',
  },
  gog: {
    bg: 'bg-[#86328a]',
    border: 'border-[#a63d8f]',
    text: 'text-[#fcfcfc]',
    label: 'GOG',
    icon: '🐉',
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export default function PlatformBadge({ 
  platform, 
  size = 'md', 
  showLabel = true 
}: PlatformBadgeProps) {
  const style = platformStyles[platform];
  
  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${style.bg} ${style.border}
        ${style.text}
        border-2 rounded
        font-bold
        ${sizeStyles[size]}
      `}
    >
      <span>{style.icon}</span>
      {showLabel && <span>{style.label}</span>}
    </span>
  );
}

interface PlatformBadgesProps {
  platforms: Array<'steam' | 'epic' | 'gog'>;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function PlatformBadges({ platforms, size = 'sm', showLabels = true }: PlatformBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => (
        <PlatformBadge
          key={platform}
          platform={platform}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}
