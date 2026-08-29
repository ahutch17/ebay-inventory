const { useState } = React;

function ShelfSyncApp() {
    return React.createElement('div', { 
        className: 'min-h-screen flex flex-col items-center justify-center p-12 text-center'
    }, 
        React.createElement('div', { className: 'w-32 h-32 rounded-full border-4 border-[#C5CBBF] bg-white flex items-center justify-center p-4 mb-6 shadow-sm mx-auto' },
            React.createElement('img', { src: 'https://imgbox.com', alt: 'Shelf Sync Logo', className: 'w-full h-full object-contain' })
        ),
        React.createElement('h1', { className: 'text-4xl font-bold tracking-widest text-[#54655A] mb-1 font-serif' }, 'SHELF SYNC'),
        React.createElement('p', { className: 'text-xs font-semibold text-[#C0A99E] uppercase tracking-widest mb-8' }, 'Listing Freshness & SEO Tracker'),
        React.createElement('button', { 
            className: 'w-full max-w-xs py-3 bg-[#54655A] text-white font-semibold tracking-widest uppercase text-sm rounded shadow hover:bg-[#C0A99E] transition-colors mx-auto'
        }, 'Tap to Enter')
    );
}

// Bind our application interface view securely to the index body layout
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(ShelfSyncApp));
