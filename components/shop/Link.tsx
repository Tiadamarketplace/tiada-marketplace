/**
 * A plain link. Every click loads the next page normally, so the browser shows
 * its own loading progress, like any ordinary website.
 */
type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean };
export default function Link({ href, prefetch, scroll, replace, ...rest }: Props) {
  void prefetch; void scroll; void replace;
  return <a href={href} {...rest} />;
}
