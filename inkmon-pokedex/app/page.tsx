import { PokedexContainer } from "@/components/pokedex";
import { HomePageWrapper } from "./HomePageWrapper";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <HomePageWrapper />
      <section className={`container ${styles.content}`}>
        <PokedexContainer />
      </section>
    </div>
  );
}
