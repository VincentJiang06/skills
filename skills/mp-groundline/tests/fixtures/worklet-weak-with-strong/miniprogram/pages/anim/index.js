// A REAL Skyline worklet animation. The file carries ONE strong, Skyline-
// exclusive signal (applyAnimatedStyle, line 7) PLUS weak tokens
// (Easing/spring(/timing(/decay() on separate lines. Because the file has a
// strong signal, the weak-token lines DO count, per-occurrence preserved.
Page({
  onReady() {
    this.applyAnimatedStyle('.box', () => ({ opacity: 1 }));   // STRONG (line 7)
    const ease = Easing.ease;                                  // weak FIRES (line 8)
    const a = spring(1);                                       // weak FIRES (line 9)
    const b = timing(300);                                     // weak FIRES (line 10)
    const c = decay(0.5);                                      // weak FIRES (line 11)
    this.setData({ ease, a, b, c });
  }
});
