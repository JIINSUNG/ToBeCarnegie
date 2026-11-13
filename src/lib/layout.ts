// 화면마다 반복되는 "맨 위 헤더 줄을 스크롤해도 안 내려가게" 스타일. #root의 좌우 패딩(16px)을
// 음수 마진으로 지우고 다시 안쪽 패딩으로 넣어서, 고정됐을 때 배경이 화면 끝까지 꽉 차 보이게 한다.
// 이 스타일이 적용되는 스크롤 영역(App.tsx의 가운데 div) 자체가 이미 안전영역만큼 위쪽 패딩을
// 갖고 있어서, top은 그냥 0으로 둔다(겹쳐서 이중으로 안 밀리게).
export const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "var(--bg)",
  marginInline: -16,
  paddingInline: 16,
  paddingBlock: 10,
};

/** 헤더의 "← 홈"/"← 목록" 같은 뒤로가기 링크 버튼 — 전엔 화면마다 똑같은 객체가 따로 있었다. */
export const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
