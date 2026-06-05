// A GENERIC charting/animation library. It reuses the bare names Easing /
// timing( / spring( / decay( that the Skyline worklet API also uses, but there
// is NO Skyline worklet here (no wx.worklet, no 'worklet' directive, no
// applyAnimatedStyle / runOnUI / runOnJS / useSharedValue). Under the file-level
// strong-signal gate these WEAK tokens must produce ZERO worklet findings — no
// phantom rewrite that would wrongly tell a migrator "there is worklet to rewrite
// here."
import { Easing } from 'chart-lib';

function spring(stiffness) { return stiffness * 2; }
function timing(ms) { return ms; }
function decay(velocity) { return velocity * 0.9; }

Page({
  data: {},
  onReady() {
    const ease = Easing.linear;          // weak: Easing — NO strong in file → 0
    const a = spring(120);               // weak: spring( — NO strong in file → 0
    const b = timing(300);               // weak: timing( — NO strong in file → 0
    const c = decay(0.5);                // weak: decay(  — NO strong in file → 0
    this.setData({ ease, a, b, c });
  }
});
