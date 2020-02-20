import { Injectable } from "@angular/core";
import * as faceapi from "face-api.js";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class FaceApiService {
  private video: any;
  private detectInterval: any;
  private modelsLoaded = false;
  private detecting = false;
  private recordedImagesLabeled = false;
  private labeledFaceDescriptions: any;
  private imageWidth: number;
  private imageWidthHeightRatio = 0.5625;

  private userSource = new Subject<any>();
  userEmitted$ = this.userSource.asObservable();

  constructor() {}

  public saveImageProperties(width: number) {
    this.imageWidth = width;
  }

  public initFaceApi(video: any) {
    this.video = video;
    this.detecting = false;
    this.recordedImagesLabeled = false;
    this.labeledFaceDescriptions = null;
    this.imageWidth = null;
    this.modelsLoaded = false;

    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./assets/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./assets/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("./assets/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./assets/models")
    ])
      .then(() => {
        console.log("Models loaded!");
        this.modelsLoaded = true;
      })
      .catch(error => {
        console.error(error);
        this.modelsLoaded = false;
      });
  }

  public saveCollectedImages(images: string[]) {
    const label = "VERFIED USER!";

    Promise.all(
      images.map(async image => {
        const bufferedImage = await faceapi.fetchImage(image);
        const detection = await faceapi
          .detectSingleFace(bufferedImage)
          .withFaceLandmarks()
          .withFaceDescriptor();

        console.log(detection.descriptor);
        return detection.descriptor;
      })
    )
      .then(descriptor => new faceapi.LabeledFaceDescriptors(label, descriptor))
      .then(data => {
        this.labeledFaceDescriptions = data;
        localStorage.setItem(
          "data",
          JSON.stringify(this.labeledFaceDescriptions)
        );
        this.recordedImagesLabeled = true;
        console.log("Finished new LabeledFaceDescriptors");
      })
      .catch(error => console.error(error));
  }

  public startDetecting() {
    this.detecting = true;
    if (!this.modelsLoaded && !this.recordedImagesLabeled) {
      console.log("Models not ready or images not finsihed labeling!");
      return;
    }

    const faceMatcher = new faceapi.FaceMatcher(
      this.labeledFaceDescriptions,
      0.6
    );

    this.detectInterval = setInterval(async () => {
      const detector: any = await faceapi
        .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detector, {
        width: this.imageWidth,
        height: this.imageWidth * this.imageWidthHeightRatio
      });

      const result = resizedDetections.map(d =>
        faceMatcher.findBestMatch(d.descriptor)
      );

      const label =
        result && result.length > 0 ? result[0].label : "UNKNOW USER!";

      this.userSource.next(label);
    }, 100);
  }

  public stopDetecting() {
    this.detecting = false;
    this.recordedImagesLabeled = false;
    clearInterval(this.detectInterval);
  }
}
