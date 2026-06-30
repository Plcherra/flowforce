import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";

const getTestimonials = (language: string) => {
  const testimonialsByCountry = {
    en: [
      {
        quoteKey: "sarahChen",
        author: "Sarah Chen",
        title: "Operations Director",
        company: "Metro Coffee Co.",
        rating: 5,
        logo: "MC",
      },
      {
        quoteKey: "michaelRodriguez",
        author: "Michael Rodriguez",
        title: "General Manager",
        company: "Coastal Restaurants",
        rating: 5,
        logo: "CR",
      },
      {
        quoteKey: "amandaFoster",
        author: "Dr. Amanda Foster",
        title: "Medical Director",
        company: "HealthFirst Clinics",
        rating: 5,
        logo: "HF",
      },
      {
        quoteKey: "jamesPark",
        author: "James Park",
        title: "Regional Manager",
        company: "TechGear Stores",
        rating: 5,
        logo: "TG",
      },
      {
        quoteKey: "lisaThompson",
        author: "Lisa Thompson",
        title: "CEO",
        company: "GrowthCo",
        rating: 5,
        logo: "GC",
      },
    ],
    es: [
      {
        quoteKey: "carlosGarcia",
        author: "Carlos García",
        title: "Director de Operaciones",
        company: "Café Madrid",
        rating: 5,
        logo: "CM",
      },
      {
        quoteKey: "mariaLopez",
        author: "María López",
        title: "Gerente General",
        company: "Restaurantes del Sur",
        rating: 5,
        logo: "RS",
      },
      {
        quoteKey: "alejandroMartinez",
        author: "Dr. Alejandro Martínez",
        title: "Director Médico",
        company: "Clínicas Salud+",
        rating: 5,
        logo: "CS",
      },
      {
        quoteKey: "anaRuiz",
        author: "Ana Ruiz",
        title: "Directora Regional",
        company: "TecnoMercado",
        rating: 5,
        logo: "TM",
      },
      {
        quoteKey: "pedroSanchez",
        author: "Pedro Sánchez",
        title: "CEO",
        company: "InnovaGroup",
        rating: 5,
        logo: "IG",
      },
    ],
    fr: [
      {
        quoteKey: "pierreMartin",
        author: "Pierre Martin",
        title: "Directeur des Opérations",
        company: "Café de Paris",
        rating: 5,
        logo: "CP",
      },
      {
        quoteKey: "sophieDubois",
        author: "Sophie Dubois",
        title: "Directrice Générale",
        company: "Restaurants Lyon",
        rating: 5,
        logo: "RL",
      },
      {
        quoteKey: "julienBernard",
        author: "Dr. Julien Bernard",
        title: "Directeur Médical",
        company: "Cliniques Santé",
        rating: 5,
        logo: "CS",
      },
      {
        quoteKey: "camilleLefebvre",
        author: "Camille Lefebvre",
        title: "Directrice Régionale",
        company: "TechStore France",
        rating: 5,
        logo: "TS",
      },
      {
        quoteKey: "lucMoreau",
        author: "Luc Moreau",
        title: "PDG",
        company: "CroissancePro",
        rating: 5,
        logo: "CP",
      },
    ],
    de: [
      {
        quoteKey: "klausWeber",
        author: "Klaus Weber",
        title: "Betriebsleiter",
        company: "Berlin Kaffee",
        rating: 5,
        logo: "BK",
      },
      {
        quoteKey: "sabineSchneider",
        author: "Sabine Schneider",
        title: "Geschäftsführerin",
        company: "Rhein Restaurants",
        rating: 5,
        logo: "RR",
      },
      {
        quoteKey: "thomasMuller",
        author: "Dr. Thomas Müller",
        title: "Ärztlicher Direktor",
        company: "GesundKliniken",
        rating: 5,
        logo: "GK",
      },
      {
        quoteKey: "andreaWagner",
        author: "Andrea Wagner",
        title: "Regionalleiterin",
        company: "TechMarkt Deutschland",
        rating: 5,
        logo: "TD",
      },
      {
        quoteKey: "michaelBauer",
        author: "Michael Bauer",
        title: "CEO",
        company: "WachstumGmbH",
        rating: 5,
        logo: "WG",
      },
    ],
    it: [
      {
        quoteKey: "marcoRossi",
        author: "Marco Rossi",
        title: "Direttore Operazioni",
        company: "Caffè Milano",
        rating: 5,
        logo: "CM",
      },
      {
        quoteKey: "giuliaBianchi",
        author: "Giulia Bianchi",
        title: "Direttrice Generale",
        company: "Ristoranti Roma",
        rating: 5,
        logo: "RR",
      },
      {
        quoteKey: "lucaFerrari",
        author: "Dr. Luca Ferrari",
        title: "Direttore Medico",
        company: "Cliniche Salute",
        rating: 5,
        logo: "CS",
      },
      {
        quoteKey: "francescaEsposito",
        author: "Francesca Esposito",
        title: "Manager Regionale",
        company: "TecnoStore Italia",
        rating: 5,
        logo: "TI",
      },
      {
        quoteKey: "davideConti",
        author: "Davide Conti",
        title: "CEO",
        company: "CrescitaSpa",
        rating: 5,
        logo: "CS",
      },
    ],
    pt: [
      {
        quoteKey: "joaoSilva",
        author: "João Silva",
        title: "Diretor de Operações",
        company: "Café Lisboa",
        rating: 5,
        logo: "CL",
      },
      {
        quoteKey: "anaSantos",
        author: "Ana Santos",
        title: "Diretora Geral",
        company: "Restaurantes Porto",
        rating: 5,
        logo: "RP",
      },
      {
        quoteKey: "carlosOliveira",
        author: "Dr. Carlos Oliveira",
        title: "Diretor Médico",
        company: "Clínicas Vida",
        rating: 5,
        logo: "CV",
      },
      {
        quoteKey: "mariaCostaE",
        author: "Maria Costa",
        title: "Gerente Regional",
        company: "TechLoja Portugal",
        rating: 5,
        logo: "TP",
      },
      {
        quoteKey: "pedroAlmeida",
        author: "Pedro Almeida",
        title: "CEO",
        company: "CrescimentoLtda",
        rating: 5,
        logo: "CL",
      },
    ],
  };

  return testimonialsByCountry[language] || testimonialsByCountry.en;
};

export function TestimonialsCarousel() {
  const { t, i18n } = useTranslation();
  const testimonials = getTestimonials(i18n.language);

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t("landing.testimonials.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t("landing.testimonials.subtitle")}
          </p>
        </div>

        {/* Testimonials Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {testimonials.map((testimonial, index) => (
              <CarouselItem
                key={index}
                className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardContent className="p-8 h-full flex flex-col">
                    {/* Quote Icon */}
                    <Quote className="h-8 w-8 text-[#3F51B5] mb-4 opacity-50" />

                    {/* Quote */}
                    <blockquote className="text-gray-700 mb-6 leading-relaxed flex-grow">
                      &quot;
                      {t(`landing.testimonials.quotes.${testimonial.quoteKey}`)}
                      &quot;
                    </blockquote>

                    {/* Rating */}
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center">
                      {/* Avatar/Logo */}
                      <div className="w-12 h-12 bg-[#3F51B5] rounded-full flex items-center justify-center text-white font-bold mr-4 group-hover:scale-110 transition-transform">
                        {testimonial.logo}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-gray-600">
                          {testimonial.title}
                        </div>
                        <div className="text-sm font-medium text-[#3F51B5]">
                          {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-8">
            {t("landing.testimonials.trustedBy")}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {/* Placeholder logos - in real implementation these would be actual company logos */}
            {[
              "TechCorp",
              "RetailMax",
              "HealthPlus",
              "ServicePro",
              "GrowthCo",
            ].map((company, index) => (
              <div
                key={index}
                className="text-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
