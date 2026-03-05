import React from 'react';
import './Home.css';

const options = [
    {
        icon: '🎮',
        title: 'Create Game',
        description: 'Start a new chain. Pick a word, record it backwards, and send it to a friend.',
        href: '/create',
    },
    {
        icon: '📖',
        title: 'Previous Games',
        description: 'Revisit games you\'ve played and see how the word drifted through the chain.',
        href: '/previous',
    },
    {
        icon: '🎓',
        title: 'Interactive Tutorial',
        description: 'New here? Play through a demo game and learn the mechanics before jumping in.',
        href: '/tutorial',
    },
];

export default class Home extends React.Component {
    render() {
        return (
            <div className="home-page">
                <div className="home-content">
                    <h1 className="home-title">Yelnats</h1>
                    <p className="home-subtitle">The backwards talking game.</p>
                    <div className="home-options">
                        {options.map((opt, i) => (
                            <a key={i} href={opt.href} className="option-card">
                                <span className="option-icon">{opt.icon}</span>
                                <div className="option-text">
                                    <p className="option-title">{opt.title}</p>
                                    <p className="option-description">{opt.description}</p>
                                </div>
                                <span className="option-arrow">→</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}
