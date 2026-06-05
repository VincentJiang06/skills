// Skyline worklet animation — NO WebView equivalent → rewrite (high).
Page({
  data: {},
  onReady() {
    const offset = wx.worklet.shared(0);
    this.applyAnimatedStyle('.box', () => {
      'worklet';
      return { transform: `translateX(${offset.value}px)` };
    });
    offset.value = wx.worklet.timing(100, { duration: 300, easing: Easing.ease });
  },
  onDrag(e) {
    runOnUI(() => {
      'worklet';
      const v = useSharedValue(0);
      v.value = e.detail.dx;
    })();
  }
});
