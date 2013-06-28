/**
 * Counts the number of disconnected clusters in a graph.
 * Via simple message passing algorithm.
 * @param graph
 */
function findClusters(graph) {
	// find connected components of the graph
	iteration = 0;
	msgs = {};
	for(var node in graph) {
		msgs[node] = node;
	}
	
	var changed; // will signal convergence
	do {
		changed = false;
		for(var node in graph) {
			// send msg to neighbors
			for(var neighbor in graph[node]) {
				if(msgs[node] < msgs[neighbor]) {
					msgs[neighbor] = msgs[node];
					changed = true;
				}
			}
		}
	} while(changed); // until convergence
	
	var uniques = {};	
	for(var msg in msgs) {
		uniques[msgs[msg]] = 1;
	}
	
	var count = 0;
	for(k in uniques) {
		count++;
	}
	
	return count;
}

/**
 * Computes some local and global features of the graph such as the
 * global clustering coefficient, the individual clustering coefficient,
 * number of edges in egonet of every node, degree of every node, etc. 
 */
function computeFeatures(graph) {
	var averageCc = 0;
	var nodes = 0;
	var result = {};
	var averageDegree = 0;
	var maxDegree = 0;
	var edges = 0;
	
	result.nodeFeatures = [];
	for(var node in graph) {
		// add the neighbors to an array to be able to iterate them in order easily
		var neighbors = [];
		var degree = 0;
		for(var neighbor in graph[node]) {
			edges++;
			neighbors[degree] = neighbor;
			degree++;
		}
		// add one self, otherwise nodes with degree = 1 have egonet links = 0
//		neighbors[degree] = node;
		// count the number of distinct links between neighbors
		var nlinks = 0;
		// build a graph with the neighbors for calculating e.g. the >> eigenvalue of the graph
		var neighborsGraph = {};
		// calculate max degree in egonet
		var maxEgonetDegree = 0;

		var averageEgonetDegree = 0;
		
		for(var i = 0; i < neighbors.length; i++) {
			var egonetDegree = 0;
			for(var j = 0; j < neighbors.length; j++) {
				if(i == j) {
					continue;
				}
				if(graph[neighbors[i]][neighbors[j]]) {
					if(!neighborsGraph[neighbors[i]]) {
						neighborsGraph[neighbors[i]] = {};
					}
					neighborsGraph[neighbors[i]][neighbors[j]] = neighbors[j];
					nlinks++;
					egonetDegree++;
				};
			};
			averageEgonetDegree += egonetDegree;
			maxEgonetDegree = Math.max(maxEgonetDegree, egonetDegree);
		}
		
		// clustering coefficient (http://en.wikipedia.org/wiki/Clustering_coefficient)
		c = 0;
		if(degree > 1) {
			c = nlinks / (degree*(degree - 1));
		}
		
		console.log(nlinks + " " + degree + " " + c + " " + node);
		
		result.nodeFeatures[nodes] = {};
		
		result.nodeFeatures[nodes].degree = degree;
		averageDegree += result.nodeFeatures[nodes].degree;
		maxDegree = Math.max(maxDegree, result.nodeFeatures[nodes].degree);
		result.nodeFeatures[nodes].egonetLinks = nlinks;
		result.nodeFeatures[nodes].clusteringCoefficient = roundToTwo(c);
		result.nodeFeatures[nodes].node = node;
		result.nodeFeatures[nodes].largestEigenvalue = largestEigenValue(neighborsGraph, neighbors).eigenvalue;
		result.nodeFeatures[nodes].maxEgonetDegree = maxEgonetDegree;
		result.nodeFeatures[nodes].averageEgonetDegree = roundToTwo(averageEgonetDegree / degree);
		
		averageCc += c;
		nodes++;
	};
	
	result.edges = edges;
	result.nNodes = nodes;
	result.averageDegree = roundToTwo(averageDegree / nodes);
	result.maxDegree = maxDegree;
	result.clusteringCoefficient = roundToTwo(averageCc / nodes);
	
	return result;
}

/**
 * Calculates the largest eigenvalue of the graph and the associated eigenvector,
 * which can be interpretated as some kind of "PageRank" for each node (Eigenvector centrality):
 * 
 * Eigenvector centrality:
 * 
 * http://en.wikipedia.org/wiki/Centrality
 * 
 * In general, there will be many different eigenvalues for which an eigenvector solution exists. 
 * However, the additional requirement that all the entries in the eigenvector be positive 
 * implies (by the Perron–Frobenius theorem) that only the greatest eigenvalue results in the 
 * desired centrality measure.
 * 
 * @param graph
 */
function largestEigenValue(graph, nodeByIndex) {
	var vect = [];
	var nodes = 0;
	// generate a random vector
	// and an auxiliar node lookup
	// which I should refactor someday to be already pre-calculated
	for(var node in graph) {
		vect[nodes] = Math.random();
		nodes++;
	}
	// http://en.wikipedia.org/wiki/Power_iteration
	var adjacencyMatrix = adjacencyMatrixOf(graph, nodeByIndex, nodes);
	var lastNorm;
	var norm = 0;
	do {
		var tmp = [];
		lastNorm = norm;
		for(var i = 0; i < nodes; i++) {
			tmp[i] = 0;
			for(var j = 0; j < nodes; j++) {
				tmp[i] += vect[j] * adjacencyMatrix[i][j];
			}
		}
		// calculate the length of the resultant vector
		norm = 0;
		for(var i = 0; i < nodes; i++) {
			norm += tmp[i]*tmp[i];
		}
		norm = Math.sqrt(norm);
		vect = tmp;
		// normalize vect to unit vector for next iteration
		for(var i = 0; i < nodes; i++) {
			vect[i] = vect[i] / norm;
		}
	} while(Math.abs(norm - lastNorm) > 0.1);
	// vect is the eigenvector and has the "PageRanks" too.
	
	for(var i = 0; i < nodes; i++) {
		var rank = vect[i];
		vect[i] = {};
		vect[i].node = nodeByIndex[i];
		vect[i].rank = roundToTwo(rank);
	}
	
	vect.sort(function(a, b) {
		return b.rank - a.rank;
	});
	
	var result = {};
	result.eigenvalue = roundToTwo(norm);
	result.ranks = vect;
	
	return result;
}

/**
 * Return the adjacency matrix of the graph Javascript object.
 * 
 * @param graph
 * @returns {Array}
 */
function adjacencyMatrixOf(graph, nodeByIndex, nodes) {
	// construct adjacency matrix
	var adjacencyMatrix = new Array(nodes);
	for(var i = 0; i < nodes; i++) {
		adjacencyMatrix[i] = new Array(nodes);
		for(var j = 0; j < nodes; j++) {
			if(graph[nodeByIndex[i]] && graph[nodeByIndex[i]][nodeByIndex[j]]) {
				adjacencyMatrix[i][j] = 1;
			} else {
				adjacencyMatrix[i][j] = 0;
			}
		}
	}
	return adjacencyMatrix;
}

/**
 * Write a matrix to the Javascript console.
 * 
 * @param matrix
 */
function matrixLog(matrix) {
	for(var i = 0; i < matrix.length; i++) {
		var str = "";
		for(var j = 0; j < matrix.length; j++) {
			str += matrix[i][j] + " "; 
		}
		console.log(str);
	}
}

/**
 * Multiply two matrixs.
 * 
 * @param m1
 * @param m2
 * @returns {Array}
 */
function multiplyMatrix(m1, m2) {
    var result = [];
    for(var j = 0; j < m2.length; j++) {
        result[j] = [];
        for(var k = 0; k < m1[0].length; k++) {
            var sum = 0;
            for(var i = 0; i < m1.length; i++) {
                sum += m1[i][k] * m2[j][i];
            }
            result[j].push(sum);
        }
    }
    return result;
}

function roundToTwo(value) {
    return(Math.round(value * 100) / 100);
}

/**
 * http://en.wikipedia.org/wiki/Betweenness_centrality
 * 
 * Fast algorithm: the gone that uses Gephi:
 * 
 * http://www.inf.uni-konstanz.de/algo/publications/b-fabc-01.pdf
 */
function betweennessCentrality(graph, nodeByIndex, nodes) {
	var adjacencyMatrix = adjacencyMatrixOf(graph, nodeByIndex, nodes);
	
	// a matrix that will contain number of shortest paths and length of those.
	var pathsMatrix = new Array(nodes);
	for(var i = 0; i < nodes; i++) {
		pathsMatrix[i] = new Array(nodes);
		for(var j = 0; j < nodes; j++) {
			if(adjacencyMatrix[i][j]) {
				pathsMatrix[i][j] = {};
				pathsMatrix[i][j].length = 1;
				pathsMatrix[i][j].count = 1;
			}
		}
	}
	
	// http://1stprinciples.wordpress.com/2008/03/30/some-interesting-properties-of-adjacency-matrices/
	convertedAdjacencyMatrix = adjacencyMatrix;

	// compute all paths until length (n-1), or until full coverage
	// (this will give the diameter of the graph as well).	
	var diameter = 1;
	var fullyCovered;
	do {
		fullyCovered = true;
		convertedAdjacencyMatrix = multiplyMatrix(convertedAdjacencyMatrix, adjacencyMatrix);
		for(var i = 0; i < nodes; i++) {
			for(var j = 0; j < nodes; j++) {
				if(convertedAdjacencyMatrix[i][j] && !pathsMatrix[i][j]) {
					pathsMatrix[i][j] = {};
					pathsMatrix[i][j].length = diameter + 1;
					pathsMatrix[i][j].count = convertedAdjacencyMatrix[i][j];
					fullyCovered = false;
				}
			}
		}
		diameter++;
	} while(!fullyCovered && diameter < nodes);
	
	var centralities = [];
	
	for(var n = 0; n < nodes; n++) {
		var nShortestPaths = 0;
		var totalPaths = 0;
		for(var i = 0; i < nodes; i++) {
			if(i == n) {
				continue;
			}
			for(var j = 0; j < nodes; j++) {
				if(j == n) {
					continue;
				}
				// is there a short path from i to j?
				if(pathsMatrix[i][j]) {
					// how many?
					totalPaths += pathsMatrix[i][j].count;
				}
				// is there a short path from i to j that goes through n?
				// that's true if and only if min_d(i, n) + min_d(n, j) = min_d(i, j)
				if(pathsMatrix[i][j] && pathsMatrix[i][n] && pathsMatrix[n][j] &&
				(pathsMatrix[i][n].length + pathsMatrix[n][j].length == pathsMatrix[i][j].length)) {
					// how many?
					nShortestPaths += pathsMatrix[i][n].count * pathsMatrix[n][j].count;
				} 
			}
		}
		// now we have the betwenness centrality of this node
		var centrality = roundToTwo(nShortestPaths / totalPaths);
		centralities[n] = {};
		centralities[n].centrality = centrality;
		centralities[n].node = nodeByIndex[n];
		centralities[n].nShortestPaths = nShortestPaths;
		centralities[n].totalPaths = totalPaths;
	}
	
	result = {};
	result.diameter = diameter;
	result.centralities = centralities;
	return result;
}

/**
 * Simplest linear regression ever.
 * 
 * http://ictedusrv.cumbria.ac.uk/maths/SecMaths/U4/page_97.htm
 */
function leastSquares(x, y) {
	var n = x.length;
	var sumx2 = 0, sumy = 0, sumx = 0, sumxy = 0;
	for(var i = 0; i < n; i++) {
		sumx += x[i];
		sumy += y[i];
		sumxy += x[i]*y[i];
		sumx2 += x[i]*x[i];
	}
	// sumy = a*sumx + b*n
	// a = (sumy - b*n) / sumx
	var b = -1*(sumxy*sumx - sumy*sumx2)/(n*sumx2 + sumx*sumx);
	var a = (sumy - b*n) / sumx;
	var result = {};
	result.a = a;
	result.b = b;
	return result;
}