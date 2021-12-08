import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

const EXPERIMENTS = [
  "milestone3"
]

const UNSET = ""

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Name of the experiments
      experiment: "",
      // List of all classes.
      classes: [],
      // List of all base images (options for image A)
      basics: [],
      // Minimal pairs.
      minimalpairs: [],

      // All images
      images: {},

      // Name of the selected class to filter by.
      imageA: UNSET,
      // Secondary (right) image that serves as a minimal difference.
      imageB: UNSET,
      imageC: UNSET,
    };
    this.experiments = EXPERIMENTS;

    this.updateExperiment = this.updateExperiment.bind(this);
    this.updateImageA = this.updateImageA.bind(this);
    this.updateImageB = this.updateImageB.bind(this);
    this.onDeltaHover = this.onDeltaHover.bind(this);
  }

  componentDidMount() {
    // Load the last experiment.
    if (this.experiments.length > 0) {
      this.loadExperiment(this.experiments[this.experiments.length - 1]);
    }
  }

  updateExperiment(event) {
    const target = event.target;
    const experiment = target.name;
    this.loadExperiment(experiment);
  }

  updateImageA(event) {
    const name = event.target.name;
    const classA = this.state.images[name]["classname"];

    if (this.state.imageB == name) {
      // Swap.
      this.setState({
        "imageB": UNSET,
      })
    }
    this.setState({
      "imageA": name,
      "classA": classA
    })
  }
  updateImageB(event) {
    const name = event.target.name;
    if (this.state.imageA == name) {
      this.setState({
        "imageA": UNSET,
        "classA": UNSET 
      })
    }
    this.setState({
        "imageB": name,
      })
    
  }
  onDeltaHover(event) {
    const pointIndex = event.points[0].pointIndex;
    const imageC = event.points[0].data.images[pointIndex];
    this.setState({
      imageC: imageC
    })
  }

  loadExperiment(experiment) {
    d3.json(`${experiment}/experiment.json`).then(
      (data) => {
        const classA = data["images"][data["basics"][0]]["classname"];
        this.setState(
          {
            experiment: data["experiment"],
            classes: Object.keys(data['classes']),
            images: data["images"],
            basics: data["basics"],
            minimalpairs: data["minimalpairs"],
            classname: UNSET,
            imageA: data["basics"][0],
            imageB: data["basics"].find(img => data["images"][img]["classname"] != classA),
            classA: classA,
            imageC: UNSET
          }
        )

      }
    );
  }

  render() {
    const basicsCardA = <ImageMenu image={this.state.imageA} images={this.state.basics} update={this.updateImageA} title={"A"} />;
    const basicsCardB = <ImageMenu image={this.state.imageB} images={this.state.basics.filter(img => this.state.images[img]["classname"] != this.state.classA)} update={this.updateImageB} title={"B"} />;

    const imageASelected = this.state.imageA != UNSET;
    const imageBSelected = this.state.imageB != UNSET;
    const imageCSelected = this.state.imageC != UNSET;
  
    const imageACard = imageASelected ?  (
      <ImgCard
      title="Image A"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageA].predictions[classname]
        )}
        info={this.state.images[this.state.imageA]}
        experiment={this.state.experiment}
      />
    ) : null;

    const imageBCard = imageBSelected ? (
      <ImgCard
        title="Image B"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageB].predictions[classname]
        )}
        info={this.state.images[this.state.imageB]}
        experiment={this.state.experiment}
      />
    ) : null;

    const imageCCard = imageCSelected ? (
      <ImgCard
        title="Counterfactual(A)"
        classes={this.state.classes}
        predictions={this.state.classes.map(
          classname => this.state.images[this.state.imageC].predictions[classname]
        )}
        info={this.state.images[this.state.imageC]}
        experiment={this.state.experiment}
      />
    ) : null;
      
    // Move plots into a component
    let deltas = []; let x = []; let y = []; let annotations = [];
    if (imageASelected) {
      deltas = this.state.minimalpairs[this.state.imageA].map(
        imageC => deltaProbability(
          this.state.images[this.state.imageA], 
          this.state.images[imageC],
          this.state.images[this.state.imageB].classname,
          this.state.images[this.state.imageB].classname)
      );
      x = deltas.map(delta => delta["x"]);
      y = deltas.map(delta => delta["delta"]);
      annotations = deltas.map(delta => delta["annotation"]);
    }
    const deltaOtherPlot = !imageASelected ? null : (
      <div className="card-body">
          <Plot
          data={[
            {
              x: y,
              y: x,
              type: 'bar',
              mode: 'relative',
              orientation: 'h',
              images: this.state.minimalpairs[this.state.imageA],
              marker: {
                color: y.map(val => (val > 0) ? "#21abcd" : "#e52b50") // blue if positive, red if negative.
              },
              text: annotations,
              hoverinfo: "text"
            },
          ]}
          layout={{width: 550, height: 350, title: `Pr(Name(B) | counterfactual(A)) - Pr(Name(B) |  A) `, margin: {
            l: 175,
            r: 75
          }}}
          onHover={this.onDeltaHover}
          // onUnhover={this.onDeltaUnhover}
        />
        </div>
    )

    return (
      <div>
        <div className="container">
          <div className="row">
            <div className="col-md-2">
              {basicsCardA}
            </div>
            <div className="col-md-2">
              {basicsCardB}
            </div>
          </div>
          <hr />
        </div>
         
        <div className="container">
          <div className="row">
          <div className="col-md-2">
            {imageACard}
          </div>
          <div className="col-md-2">
          {imageBCard}
          </div>
          <div className="col-md-2">
              {imageCCard}
          </div>
          </div>
          <div className="row">
          <div className="col-md-4">
            {deltaOtherPlot}
          </div>
          </div>
          <hr />
        </div>
      </div >
    )
  }
}

function deltaProbability(imageFrom, imageTo, classFrom, classTo) {
  for (const [key, value] of Object.entries(imageTo.concepts)) {
    if (imageFrom.concepts[key] != value) {
      return {
        // ${key}:\n
        "x": `${imageFrom.concepts[key]}->${value}`, 
        "delta": (
          imageTo.predictions[classTo] - imageFrom.predictions[classFrom]).toFixed(2),
        "annotation": (
          `${imageFrom.predictions[classFrom].toFixed(2)}->${imageTo.predictions[classTo].toFixed(2)}` 
        )
      }
    }
  }
  throw Error("Impossible. Counterfactual should differ by exactly 1 concept.")
}

function formatImagePath(image, experiment) {
  return `./${experiment}/images/${image}`;
}

function Img(image, experiment) {
  return (
    <img src={formatImagePath(image, experiment)} className="img-fluid" data-toggle="tooltip" data-placement="left" style={{padding: "1px", border: "thin solid black"}}/>
  );
}

class ImgCard extends React.Component {
  render() {
    const sorted_classes = this.props.classes.sort(
      (a, b) => {
        const valueA = this.props.info.predictions[a];
        const valueB = this.props.info.predictions[b];
        return valueB - valueA
      }
    );
    const columns = sorted_classes.map(
      (classname, index) => {
        const color = (classname == this.props.info.classname)? "#14c523" : "#d51616"; //  "#1E1EA9" : "#585858";
        return <th key={index} style={{color: color}}>{classname}</th>
      }
    )
    const predictions = sorted_classes.map(
      (classname, index) => {
        return <td key={index}>{this.props.info.predictions[classname].toFixed(2)}</td>
      }
    )
    return (
      <div className="card-body">
          <p className="card-text">
            {this.props.title}
          </p>
        {Img(this.props.info.image, this.props.experiment)}
        <table style={{width: 150}}>
          <tr>
            {columns}
          </tr>
          <tr>
            {predictions}
          </tr>
        </table>
      </div>
    )
  }
}


class ImageMenu extends React.Component {
render() {
  const options = this.props.images.map(
    (imgname) => (
      <a
        className={this.props.image == imgname ? "dropdown-item active" : "dropdown-item"}
        key={imgname}
        name={imgname}
        onClick={this.props.update}
        checked={this.props.image == imgname}
        aria-pressed={this.props.image == imgname}
      >{imgname}</a>
    )
  );
  return (
    <div>
      <div className="card-body">
        <p className="card-text">
          Select Image {this.props.title}.
        </p>
        <div className="dropdown">
          <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            {this.props.image}
          </button>
          <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
            {options}
          </div>
        </div>
      </div>
    </div>
  );
}
}


const domContainer = document.querySelector('#entry');

ReactDOM.render(
  React.createElement(App),
  domContainer
);
