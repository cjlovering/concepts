import React from "react";
import ReactDOM from 'react-dom';
import * as d3 from "d3";
import Plot from 'react-plotly.js';

const EXPERIMENTS = [
    "mockdata"
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
        classname: UNSET,
        // Primary (left) image.
        imageA: UNSET,
        // Secondary (right) image that serves as a minimal difference.
        imageB: UNSET,
      };
      this.experiments = EXPERIMENTS;

      this.updateExperiment = this.updateExperiment.bind(this);
      this.updateClassname = this.updateClassname.bind(this);
      this.updateImageA = this.updateImageA.bind(this);
      this.updateImageB = this.updateImageB.bind(this);
      this.onDeltaHover = this.onDeltaHover.bind(this)
      this._update = this._update.bind(this);
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
    updateClassname(event) {
      // Selecting the current classname unsets it.
      const classname = (event.target.name == this.state.classname) ? UNSET : event.target.name;
      this.setState(
        {
          "classname": classname,
          "imageA": UNSET,
          "imageB": UNSET,
        }
      )
    }
    _update(event, property) {
      const name = event.target.name;
      this.setState(
            {
              [property]: name
            }
      )
    }
    updateImageA(event) {
      this._update(event, "imageA")
    }
    updateImageB(event) {
      this._update(event, "imageB")
    }
    onDeltaHover(event) {
      const pointIndex = event.points[0].pointIndex;
      const imageB = event.points[0].data.images[pointIndex];
      this.setState({
        imageB: imageB
      })
    }
    loadExperiment(experiment) {
      d3.json(`${experiment}/experiment.json`).then(
        (data) => {
          console.log(data)
          this.setState(
            {
              experiment: data["experiment"],
              classes: Object.keys(data['classes']),
              images: data["images"],
              basics: data["basics"],
              minimalpairs: data["minimalpairs"],
              classname: UNSET,
              imageA: data["basics"][0],
              imageB: data["minimalpairs"][data["basics"][0]][0],
            }
          )
        }
      );
    }

    render() {

      const experiments = this.experiments.map(
        (experiment) => (
          <a
            className={this.state.experiment == experiment ? "dropdown-item active" : "dropdown-item"}
            key={experiment}
            name={experiment}
            onClick={this.updateExperiment}
            checked={this.state.experiment == experiment}
            // aria-pressed={this.state.pivot == experiment}
          >{experiment}</a>
        )
      );
      const classes = this.state.classes.map(
        (classname) => (
          <a
            className={this.state.classname == classname ? "dropdown-item active" : "dropdown-item"}
            key={classname}
            name={classname}
            onClick={this.updateClassname}
            checked={this.state.classname == classname}
            aria-pressed={this.state.classname == classname}
          >{classname}</a>
        )
      );
      const _basics = (this.state.classname == UNSET) ? this.state.basics : this.state.basics.filter(
        (imgname) => (
          this.state.images[imgname].classname == this.state.classname
        )
      )
      const basics = _basics.map(
        (imgname) => (
          <a
            className={this.state.imgname == imgname ? "dropdown-item active" : "dropdown-item"}
            key={imgname}
            name={imgname}
            onClick={this.updateImageA}
            checked={this.state.imageA == imgname}
            aria-pressed={this.state.imageA == imgname}
          >{imgname}</a>
        )
      );

      const experimentCard = (
        <div>
          <div className="card-body">
            <p className="card-text">
              Select an experiment.
            </p>
            <div className="dropdown">
              <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {this.state.experiment}
              </button>
              <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                {experiments}
              </div>
            </div>
          </div>
        </div>
      );
      // const classCard = (
      //   <div>
      //     <div className="card-body">
      //       <p className="card-text">
      //         Select the class.
      //       </p>
      //       <div className="dropdown">
      //         <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      //           {this.state.classname}
      //         </button>
      //         <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
      //           {classes}
      //         </div>
      //       </div>
      //     </div>
      //   </div>
      // );
      const basicsCard = (
        <div>
          <div className="card-body">
            <p className="card-text">
              Select the image.
            </p>
            <div className="dropdown">
              <button className="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {this.state.imageA}
              </button>
              <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                {basics}
              </div>
            </div>
          </div>
        </div>
      );
      const imageASelected = this.state.imageA != UNSET;
      // const imageACard = !imageASelected ? null : (
      //   <div className="card-body">
      //       <p className="card-text">
      //         Image.
      //       </p>
      //       {Img(this.state.imageA, this.state.experiment)}
      //   </div>
      // )
      const imageACard = !imageASelected ? null : (
        <ImgCard
        title="Base Image"
          classes={this.state.classes}
          predictions={this.state.classes.map(
            classname => this.state.images[this.state.imageA].predictions["clip"][classname]
          )}
          info={this.state.images[this.state.imageA]}
          experiment={this.state.experiment}
        />
      )

      const imageBCard = !imageASelected ? null : (
        <ImgCard
          title="Counterfactual"
          classes={this.state.classes}
          predictions={this.state.classes.map(
            classname => this.state.images[this.state.imageB].predictions["clip"][classname]
          )}
          info={this.state.images[this.state.imageB]}
          experiment={this.state.experiment}
        />
      )

      // const imageBCard = this.state.imageB == UNSET ? null : (
      //   <div className="card-body">
      //       <p className="card-text">
      //         Image.
      //       </p>
      //       {Img(this.state.imageB, this.state.experiment)}
      //   </div>
      // )
      let predictions;
      if (imageASelected) {
        predictions = this.state.classes.map(
          classname => this.state.images[this.state.imageA].predictions["clip"][classname]
        )
      }
      // const plotCard = !imageASelected ? null : (
      //   <div className="card-body">
      //       <Plot
      //       data={[
      //         {
      //           x: this.state.classes,
      //           y: predictions,
      //           type: 'lines',
      //           mode: 'markers',
      //           marker: {color: 'red'},
      //         },
      //         {type: 'lines', x: this.state.classes, y: predictions},
      //       ]}
      //       layout={{width: 350, height: 350, title: 'Predictions'}}
      //     />
      //     </div>
      // )
      let deltas = []; let x = []; let y = []; let annotations = [];
      if (imageASelected) {
        // let dictionary = data.reduce((a,x) => ({...a, [x.id]: x.country}), {})
        deltas = this.state.minimalpairs[this.state.imageA].map(
          imageB => conceptThatDiffers(this.state.images[this.state.imageA], this.state.images[imageB])
        );
        x = deltas.map(delta => delta["x"]);
        y = deltas.map(delta => delta["delta"]);
        annotations = deltas.map(delta => delta["annotation"]);
      }

      const deltaPlotCard = !imageASelected ? null : (
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
            layout={{width: 550, height: 350, title: 'Deltas', margin: {
              l: 175,
              r: 75
            }}}
            onHover={this.onDeltaHover}
          />
          </div>
      )

      return (
        <div>
          <div className="container">
            <div className="row">
              <div className="col-md-4">
                {experimentCard}
              </div>
              <div className="col-md-4">
                {basicsCard}
              </div>
            </div>
          </div>
          <hr />
          <div className="container">
            <div className="row">
              {imageACard}
              {imageBCard}
              {deltaPlotCard}
            </div>
          </div>
          <hr />
        </div >
      )
    }
  }

  function conceptThatDiffers(imageAInfo, imageBInfo) {
    for (const [key, value] of Object.entries(imageBInfo.concepts)) {
      if (imageAInfo.concepts[key] != value) {
        return {
          // ${key}:\n
          "x": `${imageAInfo.concepts[key]}->${value}`, 
          "delta": (
            imageBInfo.predictions["clip"][imageAInfo.classname] - imageAInfo.predictions["clip"][imageAInfo.classname]),
          "annotation": (
            `${imageAInfo.predictions["clip"][imageAInfo.classname]}->${imageBInfo.predictions["clip"][imageAInfo.classname]}` 
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
      <img src={formatImagePath(image, experiment)} className="img-fluid" data-toggle="tooltip" data-placement="left"  />
      // <embed key={image['run']} src={formatImagePath(image, experiment)} className="img-fluid" data-toggle="tooltip" data-placement="left" title={formatCaption(image)} />
    );
  }

  class ImgCard extends React.Component {
    render() {
      const columns = this.props.classes.map(
        (classname, index) => {
          return <th key={index}>{classname}</th>
        }
      )
      const predictions = this.props.classes.map(
        (classname, index) => {
          return <td key={index}>{this.props.info.predictions["clip"][classname]}</td>
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

const domContainer = document.querySelector('#entry');

ReactDOM.render(
    React.createElement(App),
    domContainer
);
