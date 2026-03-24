export default function SearchBar({ onSearch }) {
    return (
        <input
            type="text"
            placeholder="Search medicine by name..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onSearch(e.target.value)}
        />
    );
}
