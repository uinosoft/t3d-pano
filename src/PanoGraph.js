class PanoGraph {

	constructor() {
		this.links = [];
	}

	link(from, to, direction) {
		for (let i = 0; i < this.links.length; i++) {
			const link = this.links[i];
			if (link.from === from && link.to === to) {
				console.warn('PanoGraph: Duplicate pano Links.');
				return this;
			}
		}

		this.links.push({ from, to, direction });

		return this;
	}

	delink(from, to) {
		for (let i = 0; i < this.links.length; i++) {
			if (this.links[i].from === from && this.links[i].to === to) {
				this.links.splice(i, 1);
				return this;
			}
		}

		return this;
	}

	getLinks(pano, result = []) {
		result.length = 0; // in case the array is not reset

		this.links.forEach(link => {
			if (link.from === pano) {
				result.push(link);
			}
		})

		return result;
	}

}

export { PanoGraph };