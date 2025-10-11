---
layout: post
title: "Arguments for transformative AI"
date: 2025-10-10
author: Abhishu Oza
excerpt: "Arguments and resources for understanding why in the near future, AI may be able to do everything humans can do — and go beyond."
---

I am a computer science major who’s been fascinated by neural networks — the basis of every interesting AI you see — ever since first learning about it. Over the past few months, I’ve read a lot more and deliberated with myself to figure out what is really going on. I think that this technology has immense power, and we are not discussing it with the seriousness and trepidation it deserves. 

If we define transformative AI as systems which can truly automate all things humans do and beyond, it would not be a new fad or a just a cool new product. It would have a dramatic impact on every area of life. It would significantly improve human health, lifespan and well being. It would revamp all of science. It's course of development would influence the balance of national powers. I'm saying it is possible to create such systems, and that actually we could be approaching such technology in the coming decades.

Such a claim requires justification. In this post, I will try to lay down bedrock arguments for the possibility of such a radical future. I have linked to resources from where I learned myself. This also allows me to link to many good resources I’ve wanted to share for a long time. Please zoom in on any claims you are interested in by checking them out.

Apologies for the em dashes in advance — no idea where I picked them up ;)

## 1. The Church Turing Thesis

![Turing Machine in Nature](/assets/images/blog/TM_in_nature.webp)

Did you know that [our ears perform a Fourier Transform to understand sound](https://youtu.be/Gc5eICzHkFU?feature=shared&t=390)? Fourier Transform is a process that decomposes a signal into its constituent frequencies. We don’t need to know what it is (although it is an elegant concept). What’s interesting is that it’s such a ubiquitous idea, that it’s not just something that humans came up with, but also emerged from nature by itself via evolutionary pressures, embedded in our physical ears. The important takeaway for us, is that we can process signals digitally by running an algorithm to perform Fourier Transform on a computer.

There is a commonality among all processes in nature: all of them must [conform to the same limitations of physics and logic](https://www.scottaaronson.com/qclec/1.pdf). 

Thinking deeply about these limitations allowed Alan Turing to conceptualize the Turing Machine — the theoretical precursor of our modern computers. It led him and his advisor to claim what we now call the Church Turing Thesis: every process in nature can be simulated by a computer. This theory laid the foundations for all of computer science. It’s why our silicon processors can run any algorithm that can be described. 

So computers are powerful things. The thesis implies that it is possible to simulate intelligence — or whatever you call the processes that happen inside the brain — in computers. All of the revolution of computers until the 2010s came through novel algorithms manually discovered and explicitly described by computer scientists. However, many crucial tasks, including basic things like recognizing objects in images (which biological brains do regularly on the fly) could not be cracked with manually designed algorithms. 

## 2. Neural Networks can find algorithms

![Neural Network](/assets/images/blog/neural_network.webp)

Ideas about the perceptron and neural networks were discovered way back in the 1950s, but they didn’t work beyond toy problems given the computing power of that time. 

But [Moore’s law](https://en.wikipedia.org/wiki/Moore%27s_law) kept marching on. Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton demonstrated in 2012 that [neural networks can be used to classify objects in images](https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf). It was one of the first times a major task with no known manual algorithm was discovered in neural networks using deep learning, and it opened the floodgates for finding algorithms in a new way.

What are neural networks? What’s so special about them?

A neural network is a structure that can potentially represent any set of algorithms, but starts out as a bunch of random numbers called weights. The data consists of inputs for which we know the outputs (for example for an image input, we have output labels telling us which object is in the image). Training is the process of iteratively updating these numbers to go from random — which initially give random outputs to inputs — to numbers that represent a good algorithm — ones that give the correct outputs for input data. The magic is in the [clever way the numbers are updated](https://www.youtube.com/watch?v=IHZwWFHWa-w&list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) using the error value on the data.

**The surprising realization from the findings of the last 13 years is this — No matter how complex the process is, if you have enough data to finely specify the outcomes of the process, deep learning can find the algorithm for that process to generalize beyond the data, without specifying how the model should work manually** [^1]. And once we have bootstrapped our model in this way, we can use Reinforcement Learning (essentially learning by trial and error) to go beyond our lack of data if needed. Neural networks can learn everything from image recognition to language translation to weather prediction to playing games superhumanly to talking and reasoning like human beings(!) … all with relatively minor changes in the neural network architecture.

There is a common misconception that models being trained on large amounts of data implies the models do not “understand” the way humans do. I cannot stress this enough — if training is set up correctly, a model will NOT memorize the data. It will learn algorithms that work. Chris Olah et al. [painstakingly analyzed all the weights](https://distill.pub/2020/circuits/zoom-in/) of a practical scale image recognition model for the first time in 2020 [^2]. They found various low-level detectors for curves and high-low frequency surfaces, high-level detectors like pose invariance object detectors, and logical circuits stitching the detectors together to create working algorithms. Remember that nobody specified any such things to be in there in the models. The detectors and algorithms emerge by themselves! This research is worth seriously mulling over. 

It is true that the procedure human brains use to learn is quite different and much better, because it can learn with much lower amounts of data. But this is a comment about the learning procedure (procedure of finding algorithms), not about the learned algorithms themselves [^3].

Do not underestimate the power of algorithms. Civilisation is the product of human brains, and our brains consist of nothing but inherited and learned algorithms. Our computers and learning procedures are now mature enough to find and run the right algorithms.

## 3. Findings of the last 13 years

![AI's Potential Domains](/assets/images/blog/some_domains_AI_can_solve.webp)

This is the most straightforward argument — AI capabilities have emerged at breakneck speed since the last 13 years. We went from simple detection task like classifying objects in images and speech recognition to high bandwidth tasks like image generation and language translation in about 4-5 years.  

In 2017, DeepMind’s AlphaGo beat the then Go world champion Lee Sedol. This was very notable because the game tree for Go expands intractably quickly so future moves cannot be calculated by brute force, like you can with chess. By 2019, OpenAI Five defeated Dota2 world champions, a long horizon game with tens of thousands of actions. 

In 2020, DeepMind’s AlphaFold 2 essentially [solved the protein folding problem](https://www.youtube.com/watch?v=P_fHJIYENdI) — a 50-year-old fundamental challenge in biology that enables dramatic speedups in drug design and even aids tackling non-biological problems like disposal of plastic waste. This work won David Baker, Demis Hassabis and John M. Jumper the 2024 Nobel Prize in Chemistry [^4]. 

By this time, OpenAI had trained GPT-3, an expensive bet entirely made on the fact that [model performance scales smoothly with model size, dataset size, and the amount of compute used for training](https://www.youtube.com/watch?v=5eqRuVp65eY) for many orders of magnitude. In March of 2022, they figured out how to [train language models to follow instructions with human feedback](https://www.youtube.com/watch?v=T_X4XFwKX8k), a crucial step in making them follow a user's intent. They hosted ChatGPT in November of that year. It was the fastest growing app of all time, acquiring 100 million users in 2 months.

Yes, language models suffer from hallucinations. But have you tried the recent releases? I’d argue hallucinations have decreased significantly, and reliability is being worked on actively. We must not fall into the “god of the gaps” fallacy for AI. Despite some unreliability though, they’ve unlocked a whole wave of new capabilities along reasoning, coding and mathematics. Claude code in action is a sight to behold. And both OpenAI and DeepMind have recently developed advanced models that achieve gold medal at the International Mathematical Olympiad [^5]. 

It is astonishing to look back and see how much we have achieved in every imaginable domain, all in about a decade. Even more surprisingly, the core idea has remained the same. Often times one does not even need to change the model architecture even as they change the domain — discovering a new design for one task has a ripple effect over progress in all other tasks.   

## Impact

![The Future](/assets/images/blog/the_future.webp)

Powerful technology enhances the contrast on all aspects of life, the good and the bad.

Neural networks can bring to fruition the long-held promise of computers. The models have already [started to automate some tasks](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/), and we are using them to rush headlong towards humanity’s biggest challenges. Neural networks will unprecedentedly catalyze research in robotics, material science, biotechnology, industrial automation, and they will allow us to approach the most intriguing mysteries of the universe, all in the coming decades. We could very well be standing at the beginning of a new era. Nothing is off the table. 

Unfortunately, our human problems remain. AI is a technology fit for concentration of power. Only our skills give us a leverage over the economy, and it is likely we will lose this leverage to computers. We need to rewrite the social contract such that it works for everybody independent of their input to the economy. We also need to get our act together on international cooperation so as to avoid a deadly AI arms race fueling autonomous militarization. The torch of liberty must be kept blazing. 

And although we can create highly robust models from a well understood training process, [we do not know how to get proven guarantees](https://arxiv.org/pdf/2412.14093) over how a neural network will behave. There is a massive amount of fundamental science yet to be done on neural networks. We need to ensure our methods of aligning AI scale faster than the capabilities — we must have a provable way to retain control in a world where human beings are not the smartest entities.

If this future is anywhere near us, our time is short. But if we can identify and diffuse the landmines together, what’s on the other side is beautiful and worth fighting for.  

## Resources and Further Reading

Ilya Sutskever has been behind the field’s most revolutionary breakthroughs. It is clear to me that he’s had the most prescient vision on this whole enterprise. His [interviews and speeches](https://www.youtube.com/playlist?list=PLNZ3NzcDaZ3Nshaex9BAgLE14B_Nepq9S) are an absolute must to internalize the gravity of our situation. Highly recommended.  

[The neural networks playlist](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) by 3Blue1Brown elegantly covers the essence of neural networks and large language models. Videos by [Andrej Karpathy](https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ) are the best out there from the programming perspective. 

Leopold Aschenbrenner has written a tour de force blog series called [Situational Awareness](https://situational-awareness.ai/) on what an accelerated future could look like. 

[The Dwarkesh Podcast](https://www.youtube.com/@DwarkeshPatel/videos) hosts guests from the AI industry and discusses the consequences in depth. The man does not shy away from the technicalities, worth subscribing to.

The Church Turing Thesis has deep significance, both for the nature of reality and for what’s possible with computers. [Scott Aaronson](https://www.scottaaronson.com/) is a theoretical computer science researcher with great lectures and papers explaining how to think about computation. His book [Quantum Computing Since Democritus](https://s3.amazonaws.com/arena-attachments/958521/7c581f75f258e9c36788c60cf45f3961.pdf?1491247031) covers the subject in the detail it deserves, especially in the first 6-7 chapters. 

<br>

---

<br>

[^1]: Though there are some partial explanations, this point is largely empirical. Why large neural networks are able to learn complex algorithms is a big open question.

[^2]: Understanding all the weights of current giant models is somewhere between extremely hard and impossible, but [scientists are trying](https://transformer-circuits.pub/).

[^3]: Consider a spectrum with all of the world's information and text (the entire internet) on one end, and everything the human brain has learned on the other end. A library cannot perform any task by itself — it needs something to efficiently implement the ideas within it. Where do the current language models sit on this spectrum? Think about it; if the models were just memorizing everything, they would either be trained on so little data that they would not be so generalisable, or else the models would be so large that they'd be infeasible to train and run on any computer that can ever be built. 

[^4]: Geoffrey Hinton also won the Nobel Prize in Physics for foundational work on neural networks. Although this is a funny categorization for an achievement in computer science, the traditional sciences have finally acknowledged the importance of these discoveries.

[^5]: Questions on the IMO are designed by a committee of experts each year. They are nowhere in the models’ training data.


