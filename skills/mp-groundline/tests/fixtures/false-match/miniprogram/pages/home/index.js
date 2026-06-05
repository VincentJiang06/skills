// JS identifiers that contain skyline keywords as substrings — must NOT match.
Page({
  data: {
    spanning: true,
    listViewData: [],
    gridViewConfig: {},
    snapshotUrl: '',
    stickyHeaderOffset: 0
  },
  onLoad() {
    const spanCount = this.data.listViewData.length; // "span" substring, not wx.worklet
    this.setData({ spanning: spanCount > 0 });
  }
});
