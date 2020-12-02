// https://turtletoy.net/turtle/4d9a3d752c

// SVG 3D module
const svg3d = SVG3D();

// Vectors

const v2 = {
	length(a, b) {
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		return Math.sqrt(dx * dx + dy * dy);
	}
};

const v3 = {
	addScalar(a, s) {
		return [
		    a[0] + s, 
		    a[1] + s, 
		    a[2] + s
		];
	},
	scale(a, s) {
		return [
		    a[0] * s, 
		    a[1] * s, 
	    	a[2] * s
	    ];
	},
	sub(a, b) {
		return [
		    a[0] - b[0], 
		    a[1] - b[1], 
		    a[2] - b[2]
		];
	},
	add(a, b) {
		return [
		    a[0] + b[0], 
		    a[1] + b[1], 
		    a[2] + b[2]
		];
	},
	multiplyMatrix(v, m) {
		const x = v[0],
			y = v[1],
			z = v[2];
		return [
			x * m[0] + y * m[4] + z * m[8] + m[12],
			x * m[1] + y * m[5] + z * m[9] + m[13],
			x * m[2] + y * m[6] + z * m[10] + m[14]
		];
	},
	cross(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]
		];
	},
	dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	},
	length(a, b) {
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const dz = b[2] - a[2];
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}
};

// Matrix 4x4

const m4 = {
	identity() {
		return [
		    1, 0, 0, 0, 
		    0, 1, 0, 0, 
		    0, 0, 1, 0, 
		    0, 0, 0, 1
		];
	},
	multiply(m, n) {
		const 
		    m1XX = m[0],  m1XY = m[1],  m1XZ = m[2],  m1XW = m[3],
			m1YX = m[4],  m1YY = m[5],  m1YZ = m[6],  m1YW = m[7],
			m1ZX = m[8],  m1ZY = m[9],  m1ZZ = m[10], m1ZW = m[11],
			m1WX = m[12], m1WY = m[13], m1WZ = m[14], m1WW = m[15],
			m2XX = n[0],  m2XY = n[1],  m2XZ = n[2],  m2XW = n[3],
			m2YX = n[4],  m2YY = n[5],  m2YZ = n[6],  m2YW = n[7],
			m2ZX = n[8],  m2ZY = n[9],  m2ZZ = n[10], m2ZW = n[11],
			m2WX = n[12], m2WY = n[13], m2WZ = n[14], m2WW = n[15];
		return [
			m1XX * m2XX + m1XY * m2YX + m1XZ * m2ZX + m1XW * m2WX,
			m1XX * m2XY + m1XY * m2YY + m1XZ * m2ZY + m1XW * m2WY,
			m1XX * m2XZ + m1XY * m2YZ + m1XZ * m2ZZ + m1XW * m2WZ,
			m1XX * m2XW + m1XY * m2YW + m1XZ * m2ZW + m1XW * m2WW,
			m1YX * m2XX + m1YY * m2YX + m1YZ * m2ZX + m1YW * m2WX,
			m1YX * m2XY + m1YY * m2YY + m1YZ * m2ZY + m1YW * m2WY,
			m1YX * m2XZ + m1YY * m2YZ + m1YZ * m2ZZ + m1YW * m2WZ,
			m1YX * m2XW + m1YY * m2YW + m1YZ * m2ZW + m1YW * m2WW,
			m1ZX * m2XX + m1ZY * m2YX + m1ZZ * m2ZX + m1ZW * m2WX,
			m1ZX * m2XY + m1ZY * m2YY + m1ZZ * m2ZY + m1ZW * m2WY,
			m1ZX * m2XZ + m1ZY * m2YZ + m1ZZ * m2ZZ + m1ZW * m2WZ,
			m1ZX * m2XW + m1ZY * m2YW + m1ZZ * m2ZW + m1ZW * m2WW,
			m1WX * m2XX + m1WY * m2YX + m1WZ * m2ZX + m1WW * m2WX,
			m1WX * m2XY + m1WY * m2YY + m1WZ * m2ZY + m1WW * m2WY,
			m1WX * m2XZ + m1WY * m2YZ + m1WZ * m2ZZ + m1WW * m2WZ,
			m1WX * m2XW + m1WY * m2YW + m1WZ * m2ZW + m1WW * m2WW
		];
	},
	scale(m, x, y, z) {
		return this.multiply(m, [
		    x, 0, 0, 0, 
		    0, y, 0, 0, 
		    0, 0, z, 0, 
		    0, 0, 0, 1
		]);
	},
	translate(m, x, y, z) {
		return this.multiply(m, [
		    1, 0, 0, 0, 
		    0, 1, 0, 0, 
		    0, 0, 1, 0, 
		    x, y, z, 1
		]);
	},
	rotateX(m, angle) {
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [
		    1, 0, 0, 0, 
		    0, c, s, 0, 
		    0, -s, c, 0, 
		    0, 0, 0, 1
		]);
	},
	rotateY(m, angle) {
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [
		    c, 0, -s, 0, 
		    0, 1, 0, 0, 
		    s, 0, c, 0, 
		    0, 0, 0, 1
		]);
	},
	rotateZ(m, angle) {
		const c = Math.cos(angle),
			s = Math.sin(angle);
		return this.multiply(m, [
		    c, -s, 0, 0, 
		    s, c, 0, 0, 
		    0, 0, 1, 0,
		    0, 0, 0, 1
		]);
	}
};



/**
 * simplified port from https://github.com/mapbox/earcut
 
 	Usage
	var triangles = Earcut.triangulate([10,0, 0,50, 60,60, 70,10]); // returns [1,0,3, 3,2,1]
	Signature: earcut(vertices[, holes, dimensions = 2]).

	Vertices is a flat array of vertex coordinates like [x0,y0, x1,y1, x2,y2, ...].
	holes is an array of hole indices if any (e.g. [5, 8] for a 12-vertex input would mean one hole with vertices 5–7 and another with 8–11).
	dimensions is the number of coordinates per vertex in the input array (2 by default).
	Each group of three vertex indices in the resulting array forms a triangle.

	Triangulating a polygon with a hole
	var triangles = Earcut.triangulate([0,0, 100,0, 100,100, 0,100,  20,20, 80,20, 80,80, 20,80], [4]);
	// [3,0,4, 5,4,0, 3,4,7, 5,0,1, 2,3,7, 6,5,1, 2,7,6, 6,1,2]
	
 */
 
 function Earcut () {

    // create a circular doubly linked list from polygon points in the specified winding order
    function linkedList(data, start, end, dim, clockwise) {
    	let i, last;
    	if (clockwise === signedArea(data, start, end, dim) > 0) {
    		for (i = start; i < end; i += dim)
    			last = insertNode(i, data[i], data[i + 1], last);
    	} else {
    		for (i = end - dim; i >= start; i -= dim)
    			last = insertNode(i, data[i], data[i + 1], last);
    	}
    	if (last && equals(last, last.next)) {
    		removeNode(last);
    		last = last.next;
    	}
    	return last;
    }
    
    // eliminate colinear or duplicate points
    function filterPoints(start, end) {
    	if (!start) return start;
    	if (!end) end = start;
    	let p = start,
    		again;
    	do {
    		again = false;
    		if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
    			removeNode(p);
    			p = end = p.prev;
    			if (p === p.next) break;
    			again = true;
    		} else {
    			p = p.next;
    		}
    	} while (again || p !== end);
    	return end;
    }
    
    // main ear slicing loop which triangulates a polygon (given as a linked list)
    function earcutLinked(ear, triangles, dim) {
    	if (!ear) return;
    	let stop = ear,
    		prev,
    		next;
    	// iterate through ears, slicing them one by one
    	while (ear.prev !== ear.next) {
    		prev = ear.prev;
    		next = ear.next;
    		if (isEar(ear)) {
    			// cut off the triangle
    			triangles.push(prev.i / dim);
    			triangles.push(ear.i / dim);
    			triangles.push(next.i / dim);
    			removeNode(ear);
    			// skipping the next vertex leads to less sliver triangles
    			ear = next.next;
    			stop = next.next;
    			continue;
    		}
    		ear = next;
    	}
    }
    
    // check whether a polygon node forms a valid ear with adjacent nodes
    function isEar(ear) {
    	const a = ear.prev,
    		b = ear,
    		c = ear.next;
    	if (area(a, b, c) >= 0) return false; // reflex, can't be an ear
    	// now make sure we don't have other points inside the potential ear
    	let p = ear.next.next;
    	while (p !== ear.prev) {
    		if (
    			pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
    			area(p.prev, p, p.next) >= 0
    		)
    			return false;
    		p = p.next;
    	}
    	return true;
    }
    
    // link every hole into the outer loop, producing a single-ring polygon without holes
    function eliminateHoles(data, holeIndices, outerNode, dim) {
    	const queue = [];
    	let i, len, start, end, list;
    	for (i = 0, len = holeIndices.length; i < len; i++) {
    		start = holeIndices[i] * dim;
    		end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
    		list = linkedList(data, start, end, dim, false);
    		if (list === list.next) list.steiner = true;
    		queue.push(getLeftmost(list));
    	}
    	queue.sort(compareX);
    	// process holes from left to right
    	for (i = 0; i < queue.length; i++) {
    		eliminateHole(queue[i], outerNode);
    		outerNode = filterPoints(outerNode, outerNode.next);
    	}
    	return outerNode;
    }
    
    function compareX(a, b) {
    	return a.x - b.x;
    }
    
    // find a bridge between vertices that connects hole with an outer ring and and link it
    function eliminateHole(hole, outerNode) {
    	outerNode = findHoleBridge(hole, outerNode);
    	if (outerNode) {
    		const b = splitPolygon(outerNode, hole);
    		// filter collinear points around the cuts
    		filterPoints(outerNode, outerNode.next);
    		filterPoints(b, b.next);
    	}
    }
    
    // David Eberly's algorithm for finding a bridge between hole and outer polygon
    function findHoleBridge(hole, outerNode) {
    	let p = outerNode;
    	const hx = hole.x;
    	const hy = hole.y;
    	let qx = -Infinity,
    		m;
    	// find a segment intersected by a ray from the hole's leftmost point to the left;
    	// segment's endpoint with lesser x will be potential connection point
    	do {
    		if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
    			const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
    			if (x <= hx && x > qx) {
    				qx = x;
    				if (x === hx) {
    					if (hy === p.y) return p;
    					if (hy === p.next.y) return p.next;
    				}
    				m = p.x < p.next.x ? p : p.next;
    			}
    		}
    		p = p.next;
    	} while (p !== outerNode);
    	if (!m) return null;
    	if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint
    	// look for points inside the triangle of hole point, segment intersection and endpoint;
    	// if there are no points found, we have a valid connection;
    	// otherwise choose the point of the minimum angle with the ray as connection point
    	const stop = m,
    		mx = m.x,
    		my = m.y;
    	let tanMin = Infinity,
    		tan;
    	p = m;
    	do {
    		if (
    			hx >= p.x &&
    			p.x >= mx &&
    			hx !== p.x &&
    			pointInTriangle(
    				hy < my ? hx : qx,
    				hy,
    				mx,
    				my,
    				hy < my ? qx : hx,
    				hy,
    				p.x,
    				p.y
    			)
    		) {
    			tan = Math.abs(hy - p.y) / (hx - p.x); // tangential
    			if (
    				locallyInside(p, hole) &&
    				(tan < tanMin ||
    					(tan === tanMin &&
    						(p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))
    			) {
    				m = p;
    				tanMin = tan;
    			}
    		}
    		p = p.next;
    	} while (p !== stop);
    	return m;
    }
    
    // whether sector in vertex m contains sector in vertex p in the same coordinates
    function sectorContainsSector(m, p) {
    	return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
    }
    
    // find the leftmost node of a polygon ring
    function getLeftmost(start) {
    	let p = start,
    		leftmost = start;
    	do {
    		if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y))
    			leftmost = p;
    		p = p.next;
    	} while (p !== start);
    	return leftmost;
    }
    
    // check if a point lies within a convex triangle
    function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    	return (
    		(cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
    		(ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
    		(bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
    	);
    }
    
    // signed area of a triangle
    function area(p, q, r) {
    	return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }
    
    // check if two points are equal
    function equals(p1, p2) {
    	return p1.x === p2.x && p1.y === p2.y;
    }
    
    // check if a polygon diagonal is locally inside the polygon
    function locallyInside(a, b) {
    	return area(a.prev, a, a.next) < 0
    		? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
    		: area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
    }
    
    // link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
    // if one belongs to the outer ring and another to a hole, it merges it into a single ring
    function splitPolygon(a, b) {
    	const a2 = new Node(a.i, a.x, a.y),
    		b2 = new Node(b.i, b.x, b.y),
    		an = a.next,
    		bp = b.prev;
    	a.next = b;
    	b.prev = a;
    	a2.next = an;
    	an.prev = a2;
    	b2.next = a2;
    	a2.prev = b2;
    	bp.next = b2;
    	b2.prev = bp;
    	return b2;
    }
    
    // create a node and optionally link it with previous one (in a circular doubly linked list)
    function insertNode(i, x, y, last) {
    	const p = new Node(i, x, y);
    	if (!last) {
    		p.prev = p;
    		p.next = p;
    	} else {
    		p.next = last.next;
    		p.prev = last;
    		last.next.prev = p;
    		last.next = p;
    	}
    	return p;
    }
    
    function removeNode(p) {
    	p.next.prev = p.prev;
    	p.prev.next = p.next;
    	if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    	if (p.nextZ) p.nextZ.prevZ = p.prevZ;
    }
    
    function Node(i, x, y) {
    	// vertex index in coordinates array
    	this.i = i;
    	// vertex coordinates
    	this.x = x;
    	this.y = y;
    	// previous and next vertex nodes in a polygon ring
    	this.prev = null;
    	this.next = null;
    	// z-order curve value
    	this.z = null;
    	// previous and next nodes in z-order
    	this.prevZ = null;
    	this.nextZ = null;
    	// indicates whether this is a steiner point
    	this.steiner = false;
    }
    
    function signedArea(data, start, end, dim) {
    	let sum = 0;
    	for (let i = start, j = end - dim; i < end; i += dim) {
    		sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    		j = i;
    	}
    	return sum;
    }
    
    return {
        
        triangulate: function (data, holeIndices, dim = 2) {
        	const hasHoles = holeIndices && holeIndices.length;
        	const outerLen = hasHoles ? holeIndices[0] * dim : data.length;
        	let outerNode = linkedList(data, 0, outerLen, dim, true);
        	const triangles = [];
        	if (!outerNode || outerNode.next === outerNode.prev) return triangles;
        	if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
        	earcutLinked(outerNode, triangles, dim);
        	return triangles;
        }
        
    }
};
    

// SVG 3D module

function SVG3D () {
    
    // triangulation (with holes)
    const earcut = Earcut();

    const Poly = class {
    	constructor(world, points) {
    		this.world = world;
    		this.triangles = [];
    		this.paths = [];
    		this.points = [];
    		this.points3d = [];
    		this.points2d = [];
    		this.holes = [];
    		this.m = m4.identity();
    		this.points.push(...points);
    	}
    	hole(points) {
    		this.holes.push(this.points.length / 2);
    		this.points.push(...points);
    		return this;
    	}
    	translate(x, y, z) {
    		this.m = m4.translate(this.m, x, y, z);
    		return this;
    	}
    	rotateX(a) {
    		this.m = m4.rotateX(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	rotateY(a) {
    		this.m = m4.rotateY(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	rotateZ(a) {
    		this.m = m4.rotateZ(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	pushPoints(start, end) {
    		const len = end - start + 1;
    		const points3d = this.points3d.slice(start, end + 1);
    		const points2d = this.points2d.slice(start, end + 1);
    		for (let j = 0; j < len; j++) {
    			this.paths.push([
    				points3d[j],
    				points3d[(j + 1) % len],
    				v3.length(points3d[j], points3d[(j + 1) % len])
    			]);
    		}
    	}
    	compute() {
    	    
    		// transform
    		this.points3d.length = 0;
    		for (let i = 0; i < this.points.length; i += 2) {
    			const m = m4.multiply(this.m, this.world.m);
    			const v = v3.multiplyMatrix([-50 + this.points[i], - 50 + this.points[i + 1], 0.0], m);
    			this.points3d.push(v);
    		}
    		
    		// project
    		this.points2d.length = 0;
    		const fov = this.world.fov;
    		for (const point of this.points3d) {
    			this.points2d.push([
    				point[0] * (fov / (point[2] + fov)),
    				point[1] * (fov / (point[2] + fov))
    			]);
    		}
    		
    		// triangles
    		this.triangles.length = 0;
    		const triangles = earcut.triangulate(this.points, this.holes, 2);
    		for (let i = 0; i < triangles.length; i += 3) {
    			this.triangles.push([
    				this.points3d[triangles[i]],
    				this.points3d[triangles[i + 1]],
    				this.points3d[triangles[i + 2]]
    			]);
    		}
    		
    		// paths (outer points and hole points)
    		const outerLen = this.holes.length > 0 ? this.holes[0] : this.points3d.length;
    		this.pushPoints(0, outerLen - 1);
    		for (let i = 0; i < this.holes.length; i++) {
    			const start = this.holes[i];
    			const end =
    				i < this.holes.length - 1
    					? this.holes[i + 1] - 1
    					: this.points3d.length - 1;
    			this.pushPoints(start, end);
    		}
    	}
    	
    	render() {
    		const fov = this.world.fov;
    		for (const line of this.paths) {
    			const p0 = line[0];
    			const p1 = line[1];
    			const len = Math.floor(line[2]) * 10;
    			const [dx, dy, dz] = v3.sub(p1, p0);
    			const sx = dx / len;
    			const sy = dy / len;
    			const sz = dz / len;
    			let [px, py, pz] = p0;
    			let pVisible = false;
    			let strokes = [];
    			const R1 = [0, 0, -this.world.fov];
    			for (let i = 0; i < len; i++) {
    				const R0 = [px, py, pz];
    				let visible = true;
    				for (const poly of this.world.polygons) {
    					if (this === poly) continue;
    					for (const triangle of poly.triangles) {
    						const intersec = intersectSegmentWithTriangle(
    							R0,
    							R1,
    							triangle[0],
    							triangle[1],
    							triangle[2]
    						);
    						if (intersec === true) {
    							visible = false;
    							break;
    						}
    					}
    					if (visible === false) break;
    				}
    				if (visible !== pVisible) {
    					strokes.push([
						    px * (fov / (pz + fov)), 
						    py * (fov / (pz + fov))
						]);
    				}
    				px += sx;
    				py += sy;
    				pz += sz;
    				pVisible = visible;
    			}
    			strokes.push([
    			    p1[0] * (fov / (p1[2] + fov)),
    			    p1[1] * (fov / (p1[2] + fov))
    			]);
    			
    			// drawing polyline
    			
    			for (let i = 0; i < strokes.length - 1; i += 2) {
    				const p0 = strokes[i];
    				const p1 = strokes[i + 1];
    				turtle.penup();
    				turtle.goto(p0[0], p0[1]);
    				turtle.pendown();
    				turtle.goto(p1[0], p1[1]);
    			}
    		}
    	}
    };
    
    const World = class {
    	constructor() {
    		this.polygons = [];
    		this.m = m4.identity();
    		this.fov = 350;
    	}
    	translate(x, y, z) {
    		this.m = m4.translate(this.m, x, y, z);
    		return this;
    	}
    	rotateX(a) {
    		this.m = m4.rotateX(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	rotateY(a) {
    		this.m = m4.rotateY(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	rotateZ(a) {
    		this.m = m4.rotateZ(this.m, (a * Math.PI) / 180);
    		return this;
    	}
    	render() {
    		for (const poly of this.polygons) {
    			poly.compute();
    		}
    		for (const poly of this.polygons) {
    			poly.render();
    		}
    	}
    	poly(points) {
    		const poly = new Poly(this, points);
    		this.polygons.push(poly);
    		return poly;
    	}
    	rect(x, y, w, h) {
    		return [
    		    x, 
    		    y, 
    		    x + w, 
    		    y, 
    		    x + w, 
    		    y + h, 
    		    x, 
    		    y + h
    	    ];
    	}
    };
    
    function intersectSegmentWithTriangle(R0, R1, S0, S1, S2) {
    	// Ref: http://geomalgorithms.com/a06-_intersect-2.html
    	// segment plane
    	const u = v3.sub(S1, S0);
    	const v = v3.sub(S2, S0);
    	const n = v3.cross(u, v);
    	const dir = v3.sub(R1, R0);
    	const w0 = v3.sub(R0, S0);
    	const a = -v3.dot(n, w0);
    	const b = v3.dot(n, dir);
    	if (Math.abs(b) < 0.00000001) return false;
    	const r = a / b;
    	if (r < 0.0) return false;
    	if (r > 1.0) return false;
    	// intersection point in i
    	const dr = v3.scale(dir, r);
    	const i = v3.add(R0, dr);
    	const w = v3.sub(i, S0);
    	const uu = v3.dot(u, u);
    	const uv = v3.dot(u, v);
    	const vv = v3.dot(v, v);
    	const wu = v3.dot(w, u);
    	const wv = v3.dot(w, v);
    	const d = uv * uv - uu * vv;
    	const s = (uv * wv - vv * wu) / d;
    	if (s < 0.0 || s > 1.0) return false;
    	const t = (uv * wu - uu * wv) / d;
    	if (t < 0.0 || s + t > 1.0) return false;
    	return true;
    }

    return {
        World: World
    }
};


console.clear();

const scene = () => {

	const world = new svg3d.World();
	const R = world.rect;
	
	const h1 = [10, 5, 15, 25,5, 25];// triangle 
	const h2 = R(20, 15, 40, 65);
	const h3 = R(70, 40, 20, 50);
	const h4 = R(70, 5, 20, 20);

	const wall1 = world.poly(R(0, 0, 100, 100)).hole(h1).hole(h2).hole(h3).hole(h4);
	const wall2 = world.poly(R(0, 0, 100, 100)).hole(h1).hole(h2).hole(h3).hole(h4).translate(12, 0, 0).rotateX(-90);

	world.rotateX(Math.random() * 360).rotateY(Math.random() * 360);

	world.render();
	
};

scene();
