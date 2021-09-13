---
layout: default
---
# Portfolio
---
## Data Science & Machine Learning

### Computer Vision:

#### U-NET for SPINE Vertebrae Detection with Pytorch

<center><img src="/assets/img/img55.png"/></center>
<br>

<div style="text-align: justify">End-to-end (from data collection to training) proof-of-concept research project where I was in charge of extracting full body (thoracic & lumbar) spine X-ray images from a database with more than 100,000 thousand medical images (x-rays, MRI's and CT scans). The extracted DICOM files where converted to .PNG format, cleaned, filtered and classified (between with & without implants) using a basic CNN classifier. Afterwards, for a portion of the images I did manual annotations of the vertebrae and created masks for such annotations, for training and evaluation purposes. I implemented, trained and fine-tuned a U-NET Convolutional Neural Network, using Pytorch and fast.ai framework, that is able to recognize each vertebra from a given input thoracic x-ray. Finally, I created a pos-processing script that uses OpenCV for drawing the identified vertebrae over the input x-ray and calculate angle of deviation for each vertebra.</div>

<br>
*Materials on this project can't be shared because the project is in the process of obtaining a grant from the Russian Federation government.*

---

#### CS231n: Convolutional Neural Networks for Visual Recognition

[<img src="https://img.shields.io/badge/GitHub-View%20on%20GitHub-blue?style=flat&logo=github">](https://github.com/juanfpinzon/CS231n-self-paced)

<div style="text-align: justify">This is my implementation of assignments and projects in <a href="http://cs231n.stanford.edu/" target="_blank">CS231n: Convolutional Neural Networks for Visual Recognition</a> by Stanford University (Spring, 2019). NumPy implementations of forward and backward pass of each layer in a convolutional neural network have given me a deep understanding of how state-of-the-art Computer Vision architectures work under the hood. Furthermore, I explored the inner workings of Deep Learning by implementing Style Transfer, Deep Dream, Texture Synthesis in PyTorch and generating new images with GANs.</div>
<br>

---

### Natural Language Processing (NLP):

#### Resume/CV Named Entity Recognition (NER) Extractor

<center><img src="/assets/img/cv.png"/></center>
<br>

<div style="text-align: justify">Research project in which our team had the task to create a resume/CV parser which was able to recognize main entities such as name, email, degree, previous working experience, soft skills, technical skills and others. To accomplish this task we had to gather from open-source sources and manually annotate the dataset according the desired Named Entities to extract. We used Pytorch and the FlairNLP python framework for training our models. Given the difficulty of the task in hand our results did not meet clients expectations for production deployment but we contributed with a paper publication in a well known NLP conference and the publication of the 500 NER annotated resumes/CVs for others to use.</div>
<br>

*   *Published Paper:*  [Limitations of Neural Networks-based NER for Resume Data Extraction - Sociedad Española para el Procesamiento del Lenguaje Natural (2020)](http://journal.sepln.org/sepln/ojs/ojs/index.php/pln/article/view/6276)
*   [545 Open Source NER Annotated CVs Dataset](https://github.com/juanfpinzon/resume-dataset)
*   [Example Notebook 1](https://github.com/juanfpinzon/juanfpinzon.github.io/blob/master/assets/notebooks/ner-training-template.ipynb): Pytorch & FlairNLP NER training pipeline.
*   [Example Notebook 2](https://github.com/juanfpinzon/juanfpinzon.github.io/blob/master/assets/notebooks/skills-semantic-similarity-scoring-50cvs.ipynb): Pytorch & FlairNLP NER extraction from CVs and matching with skills from ONET database pipeline.

---

## Data Engineering

### DICOM2STL:

[<img src="https://img.shields.io/badge/GitHub-View%20on%20GitHub-blue?style=flat&logo=github">](https://github.com/juanfpinzon/dicom2stl)

<div style="text-align: justify">Updated, fixed and adapted an Open Source python script that transform input CT Scans as DICOM (International standard format for medical images) series files and generates a STL surface mesh. The code uses the VTK and SimpleITK python libraries and the image processing pipeline is as follows:</div>
<br>

*   Shrink the volume
*   Anisotropic smoothing 
*   Double threshold filter
*   Median filter
*   Pad the volume
After all the image processing is finished, the volume is converted to a VTK image and the following VTK pipeline is executed:
*   Extract a surface mesh from the VTK image
*   Apply the clean mesh filter
*   Apply the smooth mesh filter
*   Apply the reduce mesh filter
*   Write out an STL file
A CLI interface has been added to allow for the easy setting of such parameters.

<div style="text-align: justify">The script and it's filter and smoothing parameters have been tuned to perform best for Cranial scans since the code is a key element of the a product called <a href="http://autobone.nprog.ru/login" target="_blank">Autobone</a>, Autobone is a tool for building prototypes of cranial implants as polygonal mesh. The engine is based on deep learning approach using spherical CNN on icosahedral grid. The product is targeted at doctors which have the need of created cranial implants as polygonal meshes from their patient CT Scans. 
This code was used to generate the 1,000+ cranial STL 3D models in which the model was trained on. In the UI/UX this code allows the user to upload their cranial CT Scan DICOM series, create the 3D STL mesh which is given as input to the deep learning model so it predicts the appropriate implant mesh.</div>  
---
<center>© 2021 Juan F. Pinzon. Powered by Jekyll and the Minimal Theme.</center>

<!-- Text can be **bold**, _italic_, or ~~strikethrough~~.

[Link to another page](./another-page.html).

There should be whitespace between paragraphs.

There should be whitespace between paragraphs. We recommend including a README, or a file with information about your project.


> This is a blockquote following a header.
>
> When something is important enough, you do it even if the odds are not in your favor.

### Header 3

```js
// Javascript code with syntax highlighting.
var fun = function lang(l) {
  dateformat.i18n = require('./lang/' + l)
  return true;
}
```

```ruby
# Ruby code with syntax highlighting
GitHubPages::Dependencies.gems.each do |gem, version|
  s.add_dependency(gem, "= #{version}")
end
```

#### Header 4

*   This is an unordered list following a header.
*   This is an unordered list following a header.
*   This is an unordered list following a header.

##### Header 5

1.  This is an ordered list following a header.
2.  This is an ordered list following a header.
3.  This is an ordered list following a header.

###### Header 6

| head1        | head two          | three |
|:-------------|:------------------|:------|
| ok           | good swedish fish | nice  |
| out of stock | good and plenty   | nice  |
| ok           | good `oreos`      | hmm   |
| ok           | good `zoute` drop | yumm  |

### There's a horizontal rule below this.

* * *

### Here is an unordered list:

*   Item foo
*   Item bar
*   Item baz
*   Item zip

### And an ordered list:

1.  Item one
1.  Item two
1.  Item three
1.  Item four

### And a nested list:

- level 1 item
  - level 2 item
  - level 2 item
    - level 3 item
    - level 3 item
- level 1 item
  - level 2 item
  - level 2 item
  - level 2 item
- level 1 item
  - level 2 item
  - level 2 item
- level 1 item

### Small image

![Octocat](https://github.githubassets.com/images/icons/emoji/octocat.png)

### Large image

![Branching](https://guides.github.com/activities/hello-world/branching.png)


### Definition lists can be used with HTML syntax.

<dl>
<dt>Name</dt>
<dd>Godzilla</dd>
<dt>Born</dt>
<dd>1952</dd>
<dt>Birthplace</dt>
<dd>Japan</dd>
<dt>Color</dt>
<dd>Green</dd>
</dl>

```
Long, single-line code blocks should not wrap. They should horizontally scroll if they are too long. This line should be long enough to demonstrate this.
```

```
The final element.
``` -->
