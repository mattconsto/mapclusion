const clamp = (value, min, max) => {
	return value > min ? (value < max ? value : max) : min;
};

function titleCase(str) {
	return str.replace(
		/\w\S*/g,
		m => m.charAt(0).toUpperCase() + m.substr(1).toLowerCase()
	);
}