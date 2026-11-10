// 화면마다 반복되는 "맨 위 헤더 줄을 스크롤해도 안 내려가게" 스타일. #root의 좌우 패딩(16px)을
// 음수 마진으로 지우고 다시 안쪽 패딩으로 넣어서, 고정됐을 때 배경이 화면 끝까지 꽉 차 보이게 한다.
// top은 0이 아니라 safe-area-inset-top로 둬서, 노치 있는 기기에서도 상태바 밑에 딱 붙게 한다.
export const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: "env(safe-area-inset-top, 0px)",
  zIndex: 5,
  background: "var(--bg)",
  marginInline: -16,
  paddingInline: 16,
  paddingBlock: 10,
};
