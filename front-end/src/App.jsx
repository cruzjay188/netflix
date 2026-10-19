import Header from './components/Header.jsx'
import MyList from './views/MyList.jsx'

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <MyList />
      </main>
    </>
  )
}
