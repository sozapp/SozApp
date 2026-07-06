import { Redirect } from 'expo-router';

/** /premium — paywall ekranına yönlendirir */
export default function PremiumRoute() {
  return <Redirect href="/paywall" />;
}
