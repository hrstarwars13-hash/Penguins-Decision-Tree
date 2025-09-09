// Penguins Decision Tree Visualization
// Loads tree_data.json and animates balls falling through the tree

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d');
const RUN_BTN = document.getElementById('run-btn');

// Leaf colors
const LEAF_COLORS = {
  0: 'orange',    // Adelie
  1: 'red',       // Chinstrap
  2: 'green'      // Gentoo
};
const NODE_COLOR = 'blue';

let tree, balls, speciesMap;
let treeNodes = [];
let animBalls = [];

// Layout constants
const TREE_TOP = 140; // Move the tree down a bit
const TREE_LEFT = 470; // Move the tree to the right
const LEAF_RADIUS = 72;
const NODE_RADIUS = 70; // Slightly smaller for blue (non-leaf) circles
const LEVEL_HEIGHT = 140;
const BALL_RADIUS = 10;

// Load tree and balls
fetch('tree_data.json')
  .then(r => r.json())
  .then(data => {
    tree = data.tree;
    balls = data.balls;
    speciesMap = data.species_map;
    layoutTree();
    drawTree();
  });

// Recursively layout the tree for drawing, spreading leafs far apart
function layoutTree() {
  treeNodes = [];
  let leafXs = [];
  // First, count leaves to spread them evenly
  function countLeaves(node) {
    if (node.is_leaf) return 1;
    return countLeaves(node.left) + countLeaves(node.right);
  }
  const totalLeaves = countLeaves(tree);
  const leafSpacing = 220; // More space between leafs
  const firstLeafX = TREE_LEFT - ((totalLeaves-1)/2) * leafSpacing;
  let leafIdx = 0;
  function recurse(node, depth) {
    let x, y = TREE_TOP + depth * LEVEL_HEIGHT;
    if (node.is_leaf) {
      x = firstLeafX + leafIdx * leafSpacing;
      leafXs.push(x);
      leafIdx++;
    } else {
      // x is average of left and right child x
      let leftX = recurse(node.left, depth+1);
      let rightX = recurse(node.right, depth+1);
      x = (leftX + rightX) / 2;
    }
    let thisNode = {
      ...node,
      depth,
      x,
      y
    };
    treeNodes.push(thisNode);
    // Attach reference for parent-child edge drawing
    if (!node.is_leaf) {
      thisNode.left = treeNodes.find(n => n !== thisNode && n.x === leafXs[leafIdx-2] && n.depth === depth+1) || treeNodes.find(n => n !== thisNode && n.depth === depth+1 && n.x < x);
      thisNode.right = treeNodes.find(n => n !== thisNode && n.x === leafXs[leafIdx-1] && n.depth === depth+1) || treeNodes.find(n => n !== thisNode && n.depth === depth+1 && n.x > x);
    }
    return x;
  }
  recurse(tree, 0);
}

// Draw the tree
function drawTree() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw edges (parent to child)
  treeNodes.forEach(node => {
    if (!node.is_leaf) {
      if (node.left) drawEdge(node, node.left);
      if (node.right) drawEdge(node, node.right);
    }
  });
  // Draw nodes
  treeNodes.forEach(node => drawNode(node));
  // Draw balls
  animBalls.forEach(ball => drawBall(ball));
}

// No longer needed: drawLeafConnections

function drawEdge(parent, child) {
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(parent.x, parent.y + NODE_RADIUS);
  ctx.lineTo(child.x, child.y - NODE_RADIUS);
  ctx.stroke();
}

function drawNode(node) {
  ctx.beginPath();
  let radius = node.is_leaf ? LEAF_RADIUS : NODE_RADIUS;
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = node.is_leaf ? LEAF_COLORS[node.pred] : NODE_COLOR;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  // Make the font in the top blue circle (root) a little smaller
  let isRoot = !node.is_leaf && node.depth === 0;
  ctx.font = node.is_leaf ? 'bold 26px sans-serif' : (isRoot ? 'bold 13px sans-serif' : 'bold 16px sans-serif');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (node.is_leaf) {
    ctx.fillText(speciesMap[node.pred], node.x, node.y);
  } else {
    ctx.fillText(node.feature, node.x, node.y - 22);
    ctx.font = isRoot ? '12px sans-serif' : '14px sans-serif';
    ctx.fillText('≤ ' + node.threshold.toFixed(1), node.x, node.y + 24);
  }
}

function drawBall(ball) {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = LEAF_COLORS[ball.species];
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.stroke();
}

// Animation logic
RUN_BTN.onclick = () => {
  if (animBalls.length > 0) return; // Prevent rerun
  let delay = 0;
  balls.forEach((b, i) => {
    setTimeout(() => {
      animateBall(b, i);
    }, delay);
    delay += 400;
  });
};

// Track how many balls have landed in each leaf for lining up
let ballsInLeaf = { 0: 0, 1: 0, 2: 0 };

function animateBall(ballData, ballIdx) {
  // Start at root
  let path = [];
  let node = tree;
  let x = TREE_LEFT, y = TREE_TOP - 40;
  let features = ballData.features;
  while (!node.is_leaf) {
    path.push({x, y});
    if (features[getFeatureIdx(node.feature)] <= node.threshold) {
      node = node.left;
      x -= 120 / (path.length);
    } else {
      node = node.right;
      x += 120 / (path.length);
    }
    y += LEVEL_HEIGHT;
  }
  path.push({x, y});
  // Animate ball along path
  let ball = {x: path[0].x, y: path[0].y, species: ballData.pred_species, leaf: node.pred, idx: ballIdx};
  animBalls.push(ball);
  let step = 0;
  function move() {
    if (step < path.length - 1) {
      let dx = (path[step+1].x - path[step].x) / 15;
      let dy = (path[step+1].y - path[step].y) / 15;
      let count = 0;
      function frame() {
        if (count < 15) {
          ball.x += dx;
          ball.y += dy;
          drawTree();
          count++;
          requestAnimationFrame(frame);
        } else {
          step++;
          move();
        }
      }
      frame();
    } else {
      // Ball reached leaf, line up balls in leaf
  let leafNode = treeNodes.find(n => n.is_leaf && n.pred === ball.leaf);
  let countInLeaf = ballsInLeaf[ball.leaf] || 0;
  // Arrange balls in rows of 5, centered
  let ballsPerRow = 5;
  let spacing = 2 * BALL_RADIUS + 4;
  let row = Math.floor(countInLeaf / ballsPerRow);
  let col = countInLeaf % ballsPerRow;
  let totalBalls = balls.filter(b => b.pred_species === ball.leaf).length;
  let rowWidth = Math.min(ballsPerRow, totalBalls) * spacing;
  let xOffset = (col - (Math.min(ballsPerRow, totalBalls)-1)/2) * spacing;
  let yOffset = row * (2 * BALL_RADIUS + 6);
  ball.x = leafNode.x + xOffset;
  ball.y = leafNode.y + NODE_RADIUS + BALL_RADIUS + 10 + yOffset;
  ballsInLeaf[ball.leaf] = countInLeaf + 1;
  drawTree();
    }
  }
  move();
}

function getFeatureIdx(feature) {
  const features = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
  return features.indexOf(feature);
}
