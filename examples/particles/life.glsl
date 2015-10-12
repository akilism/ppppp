precision highp float;

uniform sampler2D prevState;
uniform vec2 stateSize;

float state(vec2 coord) {
  // off and 3 neighbors == birth
  // on and 2 or 3 neighbors == alive
  // else off
  float neighborCount = 0.0;
  float alive = texture2D(prevState, fract(coord / stateSize)).r;
  vec2 neighbor;
  float nAlive;
  for(float x = -1.0; x < 2.0; x++) {
    for(float y = -1.0; y < 2.0; y++) {
      if(x == 0.0 && y == 0.0) { continue; }
      neighbor = vec2(coord.x + x, coord.y + y);
      nAlive = texture2D(prevState, fract(neighbor / stateSize)).r;
      if(nAlive == 1.0) { neighborCount++; }
      if(neighborCount > 3.0) { break; }
    }
    if(neighborCount > 3.0) { break; }
  }

  if(alive == 0.0 && neighborCount == 3.0) {
    return 1.0;
  } else if (alive == 1.0 && (neighborCount == 2.0 || neighborCount == 3.0)) {
    return 1.0;
  } else {
    return 0.0;
  }

  // return alive;
}

void main() {
  vec2 coord = gl_FragCoord.xy;


  //TODO: Compute the next state for the cell at coord
  float s = state(coord);

  gl_FragColor = vec4(s,s,s, 1.0);
}
