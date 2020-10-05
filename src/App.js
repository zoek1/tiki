import 'regenerator-runtime/runtime'
import React, {useState} from 'react'
import {fromNear2Yocto, fromYocto2Near, humanReadableDate, login, logout, parseNearAmount} from './utils'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import './global.css'

import getConfig from './config'
import Paper from "@material-ui/core/Paper";
import {makeStyles} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Big from "big.js";
import TextField from "@material-ui/core/TextField";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import Input from "@material-ui/core/Input";
import FormHelperText from "@material-ui/core/FormHelperText";
import moment from "moment";
import TableContainer from "@material-ui/core/TableContainer";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Container from "@material-ui/core/Container";
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed()

const useStyles = makeStyles({
  card: {
    backgroundColor: '#333',
    color: '#FAFAFA',
    padding: '35px 30px',
    marginTop: '15px',
    marginBottom: '15px',
  },
  label: {
    color: '#ccc'
  },
  field: {
    marginTop: '15px',
    marginBottom: '15px',
  },
  title: {
    color: '#FAFAFA !important',
    textDecoration: 'none'
  },
  table: {
    minWidth: 650,
  },
  menu: {
    display: 'flex',
    justifyContent: 'space-between',
    listStyle: 'katakana',
    textDecoration: 'none',
    color: '#ccc'
  }
})

export default function App() {
  const classes = useStyles()

  const [events, setEvents] = useState([])
  const [myEvents, setMyEvents] = useState([])

  const updateMyEvents = (events) => {
    events.map(async (event) => {
      try {
        const attendee = await window.contract.check_attendee({eventId: event.id, caller: window.accountId})
        if (attendee) {
          setMyEvents([event.id, ...myEvents])
        }
      } catch (e) {
        console.log(e)
        console.log('Failed', event.id)
      }
    })
  }

  const updateEvents = () => {
    if (window.walletConnection.isSignedIn()) {
      const timestamp = parseInt(moment().unix())
      console.log(timestamp)

      // window.contract is set by initContract in index.js
      window.contract.get_events({ accountId: window.accountId })
        .then(events => {
          setEvents(events.sort(event => timestamp - parseInt(event.start.slice(0, 10))))
          updateMyEvents(events)
        })
    }
  }

  React.useEffect(
    () => {
      console.log('Execution')
      updateEvents()
    },

    []
  )

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    return (
      <main style={{textAlign: 'center'}}>
        <h1>Let's see what happens!</h1>
        <Button variant="contained" color="secondary" onClick={login}>Sign in</Button>
      </main>
    )
  }

  return (
    // use React Fragment, <>, to avoid wrapping elements in unnecessary divs
    <Router>
      <div>
        <nav>
          <ul className={classes.menu}>
            <li>
              <Link to="/"  >Home</Link>
            </li>
            <li>
              <Link to="/new">Create event</Link>
            </li>
            <li>
              <Link to="/me">My events</Link>
            </li>
            <li>
              {window.accountId}
              <Button className="link" style={{ color: '#C51162' }} onClick={logout}>
                Sign out
              </Button>
            </li>
          </ul>
        </nav>
      <switch>
        <Route path='/new'>
          <NewEvent createEvent={() => {}} />
        </Route>
        <Route path='/me'>
          <MyEvents events={events}  myEvents={myEvents}/>
        </Route>
        <Route exact path='/event/:id' render={(props) => <EventDetail myEvents={myEvents} events={events}  {...props} />} />
        <Route exact path='/'>
          <Home events={events} myEvents={myEvents} />
        </Route>
      </switch>
      </div>
    </Router>
  )
}

const NewEvent = (props) => {
  const classes = useStyles(props)

  const  [title, setTitle] = useState('')
  const  [symbol, setSymbol] = useState('')
  const  [maxSeats, setMaxSeats] = useState(10)
  const  [seatPrice, setSeatPrice] = useState(1)
  const  [startDate, setStartDate] = useState(null)
  const  [endDate, setEndDate] = useState(null)

  const createEvent = () => {
    if (window.walletConnection.isSignedIn()) {
      const seatPriceYocto = fromNear2Yocto(seatPrice.toString())
      console.log(startDate)
      const startDateTimestamp = moment(startDate).valueOf() + "000000"
      const endDateTimestamp = moment(endDate).valueOf() + "000000"

      const payload = {
        name: title,
        symbol: symbol.replace(/\s/g,''),
        seatPrice: seatPriceYocto,
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        initialSupply: parseInt(maxSeats)
      }

      console.log(payload)

      // window.contract is set by initContract in index.js
      window.contract.factory(payload).then(events => {
          console.log('Event succesfully created')
          setTitle('')
          setSymbol('')
          setMaxSeats(0)
          setSeatPrice(0)
          setStartDate('')
          setEndDate('')
          window.location = '/'
      }).catch(() => {
        alert('Failed to create event')
      })
    }
  }

  return <Container>
    <Paper className={classes.card}>
    <form action="">

        <FormControl style={{display: 'block'}} className={classes.field}>
          <InputLabel className={classes.label} htmlFor="title">Whats the name of your events?</InputLabel>
          <Input style={{width: '100%'}} onChange={(e)  =>  setTitle(e.target.value)} id="title" aria-describedby="Event title" />
        </FormControl>
        <FormControl className={classes.field}>
          <InputLabel className={classes.label} htmlFor="symbol">Set one unique identifier</InputLabel>
          <Input onChange={(e)  => setSymbol(e.target.value)} id="symbol" aria-describedby="Event Symbol" />
          <FormHelperText style={{color: '#999'}} id="symbol-helper-text">This must be unique, this wil act as the token symbol of this event</FormHelperText>
        </FormControl>

      <div>
        <FormControl className={classes.field}>
          <InputLabel className={classes.label} htmlFor="seats">Max seats</InputLabel>
          <Input type="number" onChange={(e)  => setMaxSeats(e.target.value)} id="seats" aria-describedby="Max seats for this event" />
          <FormHelperText style={{color: '#999'}} id="symbol-helper-text">The maximum allowed number of entries</FormHelperText>
        </FormControl>
        <FormControl className={classes.field}>
          <InputLabel className={classes.label} htmlFor="seatPrice">Price per seat</InputLabel>
          <Input type="number" onChange={ (e) => setSeatPrice(e.target.value)} id="seatsPrice" aria-describedby="The price per seat" />
        </FormControl>
      </div>

      <div>
        <FormControl className={classes.field}>
          <Input type="datetime-local" onChange={(e) => setStartDate(e.target.value)} id="start" aria-describedby="Event starting date" />
          <FormHelperText style={{color: '#999'}} id="symbol-helper-text">Starting date</FormHelperText>
        </FormControl>
        <FormControl className={classes.field}>
          <Input type="datetime-local" onChange={ (e) => setEndDate(e.target.value)} id="end" aria-describedby="Event ending date" />
          <FormHelperText style={{color: '#999'}} id="symbol-helper-text">Ending Date</FormHelperText>
        </FormControl>
      </div>

      <Button onClick={createEvent} variant="contained" color="secondary">Create Event</Button>
    </form>
    </Paper>
  </Container>
}

const EventDetail = (props) => {
  const id = props.match.params.id
  const requestedEvents = (props.events || []).filter(event => event.id == id)

  return <Container>
    { requestedEvents.length ? <EventCard showTickets={true} event={requestedEvents[0]} myEvents={props.myEvents} /> : <h1>No events exists</h1> }
  </Container>
}

const MyEvents = (props) => {
  return <Container>
    {props.events.filter(event => props.myEvents.indexOf(event.id) >= 0).map(event => <EventCard myEvents={props.myEvents} event={event} />)}
  </Container>
}

const EventCard = (props) => {
  const classes = useStyles(props)
  const {event, myEvents, showTickets} = props
  const [myTicket, setMyTicket] = useState(null)
  const [tickets, setTickets] = useState([])

  if (showTickets) {
    const updateTickets = async () => {
      const tickets = await window.contract.get_attendess({eventId: event.id})
      setTickets(tickets)

      tickets.forEach((ticket) => {
        if (ticket.owner === window.accountId) {
          setMyTicket(ticket);
        }
      });

      console.log(tickets)
    }
    React.useEffect(() => { updateTickets() }, event)
  }


  function purchase() {
    if (window.walletConnection.isSignedIn()) {

      // window.contract is set by initContract in index.js
      window.contract.purchase({eventId: event.id}, BOATLOAD_OF_GAS, event.seatPrice)
        .then(events => {
          console.log('Purchased succesfully')
        })
    }
  }

  function transfer() {
    const person = prompt("Introduce the user id who will receive the ticket");

    if (person == null || person == "") {
      console.log('Transfer cancelled')
    } else {
      if (window.walletConnection.isSignedIn()) {
        // window.contract is set by initContract in index.js
        window.contract.transfer({new_owner_id: person, token_id: event.id}, BOATLOAD_OF_GAS)
          .then(events => {
            alert('Transfer successfully')
            window.location.reload()
          }).catch((e) => {
          console.log(e)
          alert('Transfer ticket failed')
        })
      }
    }
  }

  function checkIn() {
    if (window.walletConnection.isSignedIn()) {

      // window.contract is set by initContract in index.js
      window.contract.check_in({eventId: event.id}, BOATLOAD_OF_GAS)
        .then(events => {
          console.log('Succesful check in')
          window.location.reload()
        })
    }
  }

  return <Container>
    <Paper className={classes.card}>
    <Link className={classes.title} to={`/event/${event.id}`}><h1>{event.name} <span>#{event.id} - {event.symbol}</span></h1></Link>
    <p>Hosted by {event.host}</p>
    <p>Available {event.initialSupply - event.occupied} of {event.initialSupply}</p>
    <p>
      <b>Start</b> {humanReadableDate(event.start.slice(0, 10))} <br/>
      <b>Ends</b> {humanReadableDate(event.end.slice(0, 10))}
    </p>
      { myTicket && !myTicket.check_in?
        <Button onClick={checkIn} variant="contained" color="primary">Check In</Button> :
        <></>
      }
      { myEvents.indexOf(event.id) == -1 ?
        <Button onClick={purchase} variant="contained" color="secondary">Purchase by {parseNearAmount(event.seatPrice)} NEAR</Button> :
        <Button onClick={transfer} variant="contained" color="secondary">Transfer</Button>
      }



  </Paper>
    { showTickets ?
    <TableContainer component={Paper}>
      <Table className={classes.table} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="right">Attendee</TableCell>
            <TableCell align="right">Purchased At</TableCell>
            <TableCell align="right">Check in</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tickets.map((row, index) => (
            <TableRow key={index}>
              <TableCell align="right">{row.owner}</TableCell>
              <TableCell align="right">{row.purchased_at ? humanReadableDate(row.purchased_at.slice(0, 10)) : ''}</TableCell>
              <TableCell align="right">{row.check_in ? '✔️' : '❌'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer> : <></>}
    </Container>
}


const Home = (props) => {
  return <Container>
      {props.events.map(event => <EventCard myEvents={props.myEvents} event={event} />)}
    </Container>
}

// this component gets rendered by App after the form is submitted
function Notification() {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`
  return (
    <aside>
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.accountId}`}>
        {window.accountId}
      </a>
      {' '/* React trims whitespace around tags; insert literal space character when needed */}
      called method: 'setGreeting' in contract:
      {' '}
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.contract.contractId}`}>
        {window.contract.contractId}
      </a>
      <footer>
        <div>✔ Succeeded</div>
        <div>Just now</div>
      </footer>
    </aside>
  )
}
