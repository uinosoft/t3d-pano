class PanoSwitcher {

	constructor() {
		this._link = null;

		this._duration = 0;
		this._timer = 0;

		this._running = false;

		this._onUpdateCallback = null;
		this._onCompleteCallback = null;
	}

	run(link, options = {}) {
		this._link = link;

		this._duration = (options.time !== undefined ? options.time : 1000) / 1000;
		this._timer = 0;

		this._running = true;

		this._resetProperties();

		return this;
	}

	update(deltaTime) {
		if (!this._running) return;

		this._timer += deltaTime;

		let elapsed = this._timer / this._duration;
		elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

		this._updateProperties(elapsed);

		if (this._onUpdateCallback) {
			this._onUpdateCallback(this._link, elapsed);
		}

		if (elapsed === 1) {
			if (this._onCompleteCallback) {
				this._onCompleteCallback(this._link);
			}

			this._running = false;
		}
	}

	stop() {
		this._link = null;
		this._running = false;
		this._timer = 0;
		return this;
	}

	onUpdate(callback) {
		this._onUpdateCallback = callback;
		return this;
	}

	onComplete(callback) {
		this._onCompleteCallback = callback;
		return this;
	}

	_resetProperties() {

	}

	_updateProperties(elapsed) {

	}

}

export { PanoSwitcher };