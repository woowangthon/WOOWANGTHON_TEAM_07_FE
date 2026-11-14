// Material Symbols Rounded 아이콘. 기본 20px, size="lg"면 24px. 장식이라 화면 읽기에서 뺀다.
export function Icon({ name, size, className }: { name: string; size?: 'lg'; className?: string }) {
  const cls = 'ms' + (size === 'lg' ? ' ms-lg' : '') + (className ? ' ' + className : '')
  return <span className={cls} aria-hidden="true">{name}</span>
}
