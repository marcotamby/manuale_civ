import React from 'react';

interface ResourceMapping {
    keywords: string[];
    icon: string;
    color: string;
}

const RESOURCES: ResourceMapping[] = [
    {
        keywords: ['cibo', 'food', 'carne'],
        icon: 'https://data.aoe4world.com/images/resources/food.png',
        color: 'text-red-400'
    },
    {
        keywords: ['legno', 'wood'],
        icon: 'https://data.aoe4world.com/images/resources/wood.png',
        color: 'text-green-400'
    },
    {
        keywords: ['oro', 'gold'],
        icon: 'https://data.aoe4world.com/images/resources/gold.png',
        color: 'text-yellow-400'
    },
    {
        keywords: ['pietra', 'stone'],
        icon: 'https://data.aoe4world.com/images/resources/stone.png',
        color: 'text-gray-300'
    },
    {
        keywords: ['olio', 'oil', 'olive oil'],
        icon: 'https://data.aoe4world.com/images/resources/olive_oil.png',
        color: 'text-olive-400'
    }
];

interface ResourceTextProps {
    text: string;
    className?: string;
    iconSize?: number;
}

export function ResourceText({ text, className = '', iconSize = 16 }: ResourceTextProps) {
    if (!text) return null;

    // Create a regex pattern to match all keywords
    // We use word boundaries \b to avoid matching symbols inside other words
    const allKeywords = RESOURCES.flatMap(r => r.keywords);
    const pattern = new RegExp(`(\\b(?:${allKeywords.join('|')})\\b)`, 'gi');

    const parts = text.split(pattern);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                const lowerPart = part.toLowerCase();
                const resource = RESOURCES.find(r => r.keywords.includes(lowerPart));

                if (resource) {
                    return (
                        <span key={i} className={`inline-flex items-center gap-1 font-bold ${resource.color}`}>
                            {part}
                            <img
                                src={resource.icon}
                                alt={part}
                                className="inline-block align-middle"
                                style={{ width: iconSize, height: iconSize }}
                            />
                        </span>
                    );
                }

                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </span>
    );
}
