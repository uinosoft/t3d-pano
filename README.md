t3d-pano
===

[![NPM Package][npm]][npm-url]

Panorama extension for t3d.

[Demo](https://uinosoft.github.io/t3d-pano/examples/)

### Getting Started

Create pano:

````javascript
const pano = new Pano();
scene.add(pano);

pano.visible = true;
pano.material.diffuseMap = texture;
pano.material.opacity = 1;
pano.material.uniforms.stretchFactor = 0;
pano.renderOrder = 0;
````

Establish link relationships for panos:

````javascript
const graph = new PanoGraph();
// graph._links;

graph.link(pano1, pano2, direction);
graph.link(pano2, pano1, direction);

graph.delink(pano2, pano1);

// Get link infos by pano.
// Link() { dirction, from: Pano, to: Pano }
// links: [Link, Link, ...]
const links = graph.getLinks(pano1);
````

Use Pano Switcher to switch panos by link info and options:

````javascript
// FadeSwitcher / StretchSwitcher, extend PanoSwitcher
// Or maybe CustomSwitcher by user
const switcher = new FadeSwitcher();

// run switcher
switcher.run(link, options);

// call this per frame to step switcher,deltaTime in seconds
switcher.update(deltaTime);
````

Use sample:

````javascript
// When showing a pano
function showPano(pano) {
    const links = graph.getLinks(pano1);

    links.forEach(link => {
        const sprite = new Sprite();
        sprite.position.copy(link.dirction).multiplyScalar(100);

        sprite.addEventListener('click', () => {
            switcher.run(link, { time: 500 }).onUpdate((link, elapsed) => {})
                                             .onComplete((link) => {});
        });
    });
}
````

How to create CustomSwitcher:

````javascript
class CustomSwitcher extends PanoSwitcher {

	constructor() {
		super();
	}

    _resetProperties() {
		
	}

	_updateProperties(elapsed) {
        // elapsed is updated by the 'update' function, it from 0 to 1
        // link: { dirction, from: Pano, to: Pano }
        // It is recommended to write code here...
	}

}
````

[npm]: https://img.shields.io/npm/v/t3d-pano
[npm-url]: https://www.npmjs.com/package/t3d-pano