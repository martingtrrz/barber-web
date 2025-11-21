import React from "react";
import { Carousel } from "react-bootstrap";
import img1 from "../assets/slide1.jpg";
import img2 from "../assets/slide2.jpg";
import img3 from "../assets/slide3.jpg";
//import "./slider.css";

function Slider() {
  return (
    <div className="slider-container">
      <Carousel>
        <Carousel.Item>
          <img className="d-block w-100" src={img1} alt="Primer slide" />
          <Carousel.Caption>
            <h3>Mullet</h3>
          </Carousel.Caption>
        </Carousel.Item>

        <Carousel.Item>
          <img className="d-block w-100" src={img2} alt="Segundo slide" />
          <Carousel.Caption>
            <h3>Taper Fade</h3>
          </Carousel.Caption>
        </Carousel.Item>

        <Carousel.Item>
          <img className="d-block w-100" src={img3} alt="Tercer slide" />
          <Carousel.Caption>
            <h3>Barba y Fade</h3>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>
    </div>
  );
}

export default Slider;
