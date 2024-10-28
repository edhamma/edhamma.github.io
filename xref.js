
document.addEventListener('DOMContentLoaded', () => {
    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            book: params.get('book')?.toLowerCase(),
            ref: params.get('ref')?.toLowerCase(),
        };
    }

    // Function to fetch and parse objects.inv
    async function fetchAndParseObjectsInv(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const dataBuffer = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder();
        let compOffset = -1;
        // find compressed data; will fail on non-compressed objects.inv
        for (let i = 0; i < dataBuffer.length; i++) {
            // newline followed by zlib magic byte
            if (dataBuffer[i]==0x0a && dataBuffer[i+1]==0x78) compOffset=i+1;
        }
        if (compOffset === -1) { throw new Error('No compressed data found in objects.inv file.'); }
        const compData = dataBuffer.slice(compOffset);
        // Decompress the data using pako
        const decompData = pako.inflate(compData);
        // Decode the decompressed data as text
        const textData = textDecoder.decode(decompData);
        const lines = textData.split('\n');
        const inventory = {};
        // Parse each line for object-to-URL relationships
        for (const line of lines) {
            if (!line || line.startsWith('#')) continue; // Skip empty lines and comments
            const parts = line.split(' ');
            // Ensure there are enough parts to parse
            if (parts.length < 4) continue;
            const name = parts[0];
            const location = parts[3];
            const displayName = parts[4] !== '-' ? parts[4] : '';
            // Construct URL with fragment if displayName exists
            const url = location + (displayName ? `#${displayName}` : '');
            inventory[name] = url;
        }
        return inventory;
    }

    // Main function to handle redirection
    async function handleRedirection() {
        const { book, ref } = getQueryParams();
        // Display the book and reference being resolved
        const statusElement = document.getElementById('status');
        statusElement.textContent = `Resolving reference: ${book} / ${ref} …`;
        try {
            if (!book || !ref) { throw new Error('Missing required URL parameters: book and ref'); }
            const bookUrl = BOOK_URLS[book];
            if (!bookUrl) { throw new Error(`Unknown book identifier: ${book}`); }
            const inventory = await fetchAndParseObjectsInv(bookUrl+'/objects.inv');
            if (inventory[ref]) { window.location.href = bookUrl+'/'+inventory[ref]; }
            else { statusElement.textContent = `Object "${ref}" not found in the ${book} inventory.`; }
        } catch (error) {
            console.error('Error:', error);
            statusElement.textContent = `An error occurred while processing the request: ${error}.`;
        }
    }

    // Run the redirection logic
    handleRedirection();
});
