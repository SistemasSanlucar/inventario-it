import AppShell from './AppShell';
import { useInventoryApp } from './useInventoryApp';

export default function App() {
    const controller = useInventoryApp();
    return <AppShell controller={controller} />;
}
