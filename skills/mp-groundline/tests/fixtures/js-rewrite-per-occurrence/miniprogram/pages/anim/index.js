// This fixture proves per-LINE counting for JS/TS rewrite categories.
// The tokens in THIS comment (wx.worklet, applyAnimatedStyle, routeBuilder,
// wx://fade) must NOT produce any finding — comment-stripping must hold.
/* block comment also mentioning runOnUI and wx.router — still no finding. */
Page({
  data: {},
  onReady() {
    const offset = wx.worklet.shared(0);          // worklet occurrence #1 (line 8)
    this.applyAnimatedStyle('.box', () => ({}));   // worklet occurrence #2 (line 9)
    offset.value = spring(1);                       // worklet occurrence #3 (line 10)
  },
  routes() {
    const b = routeBuilder('mySheet');              // custom_route occurrence #1 (line 13)
    wx.router.addRouteBuilder('x', b);              // custom_route occurrence #2 (line 14)
    wx.navigateTo({ url: 'wx://bottom-sheet' });    // custom_route occurrence #3 (line 15)
  },
  // a SINGLE line matching BOTH patterns → exactly one worklet + one
  // custom_route finding for that one line (within-line dedupe), line 19:
  both() { useSharedValue(0); customRoute({ duration: 300 }); }
});
