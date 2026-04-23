export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  normalize() { const l = this.length(); return l > 0 ? this.scale(1 / l) : new Vec2(); }
  distTo(v) { return this.sub(v).length(); }
  clone() { return new Vec2(this.x, this.y); }
}
