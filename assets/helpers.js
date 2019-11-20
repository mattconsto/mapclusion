const clamp = (value, min, max) => {
	return value > min ? (value < max ? value : max) : min;
};

const titleCase = str => str.replace(
	/\w\S*/g,
	m => m.charAt(0).toUpperCase() + m.substr(1).toLowerCase()
);

const canvasToBlob = async canvas => new Promise(resolve => {
	canvas.toBlob(blob => {
		resolve(blob);
	});
});